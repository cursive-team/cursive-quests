import React, { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/router";
import { v4 as uuidv4 } from "uuid";
import { generateEncryptionKeyPair } from "@/lib/client/encryption";
import { generateSignatureKeyPair, sign } from "@/lib/shared/signature";
import { generateSalt, hashPassword } from "@/lib/client/utils";
import {
  createBackup,
  deleteAccountFromLocalStorage,
  saveAuthToken,
  saveKeys,
  saveProfile,
} from "@/lib/client/localStorage";
import { verifySigninCodeResponseSchema } from "../lib/server/auth";
import { encryptBackupString } from "@/lib/shared/backup";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import Link from "next/link";
import { FormStepLayout } from "@/layouts/FormStepLayout";
import { toast } from "sonner";
import { Spinner } from "@/components/Spinner";
import { Radio } from "@/components/Radio";
import { Checkbox } from "@/components/Checkbox";
import { loadMessages } from "@/lib/client/jubSignalClient";
import { encryptRegisteredMessage } from "@/lib/client/jubSignal/registered";
import { AppBackHeader } from "@/components/AppHeader";
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  GenerateRegistrationOptionsOpts as RegistrationOptions,
  GenerateAuthenticationOptionsOpts as AuthenticationOptions,
} from "@simplewebauthn/server";
import {
  startAuthentication,
  startRegistration,
} from "@simplewebauthn/browser";
import { sha256 } from "js-sha256";

enum DisplayState {
  DISPLAY,
  INPUT_EMAIL,
}

export default function Register() {
  const router = useRouter();
  const [displayState, setDisplayState] = useState<DisplayState>(
    DisplayState.DISPLAY
  );
  const [email, setEmail] = useState<string>();
  const [password, setPassword] = useState<string>();
  const [confirmPassword, setConfirmPassword] = useState<string>();

  const handleCreateWithEmail = () => {
    setDisplayState(DisplayState.INPUT_EMAIL);
  };

  const handleCreateWithPasskey = () => {
    setDisplayState(DisplayState.DISPLAY);
  };

  const handleSubmit = async (e: FormEvent<Element>) => {
    e.preventDefault();

    const registrationOptions = await generateRegistrationOptions({
      rpName: "cursive-quests",
      rpID: window.location.hostname,
      userID: "cursive",
      userName: "Cursive Quests",
      attestationType: "none",
    });

    try {
      const { id, response: authResponse } = await startRegistration(
        registrationOptions
      );
      const authPublicKey = authResponse.publicKey;
      if (!authPublicKey) {
        throw new Error("No public key returned from authenticator");
      }

      const username = sha256(id);
      await createAccount(username, id, authPublicKey);
    } catch (error) {
      console.error("Error creating account: ", error);
      toast.error("Authentication failed! Please try again.");
      return;
    }
  };

  const handleSubmitWithEmail = async (e: FormEvent<Element>) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error("Please enter an email address and password.");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    await createAccount(email, password, undefined);
  };

  const createAccount = async (
    email: string,
    password: string,
    authPublicKey: string | undefined
  ) => {
    const { privateKey, publicKey } = await generateEncryptionKeyPair();
    const { signingKey, verifyingKey } = generateSignatureKeyPair();

    let passwordSalt, passwordHash;
    passwordSalt = generateSalt();
    passwordHash = await hashPassword(password, passwordSalt);

    const displayName = email;
    const wantsServerCustody = false;
    const allowsAnalytics = false;
    const response = await fetch("/api/register/create_account", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        displayName,
        wantsServerCustody,
        allowsAnalytics,
        encryptionPublicKey: publicKey,
        signaturePublicKey: verifyingKey,
        passwordSalt,
        passwordHash,
        authPublicKey,
      }),
    });

    if (!response.ok) {
      console.error(`HTTP error! status: ${response.status}`);
      toast.error("Error creating account! Please try again.");
      return;
    }

    const data = await response.json();
    if (!data.value || !data.expiresAt) {
      console.error("Account created, but no auth token returned.");
      toast.error("Account created, but error logging in! Please try again.");
      return;
    }

    // Ensure the user is logged out of an existing session before creating a new account
    deleteAccountFromLocalStorage();
    saveKeys({
      encryptionPrivateKey: privateKey,
      signaturePrivateKey: signingKey,
    });
    saveProfile({
      displayName,
      email,
      encryptionPublicKey: publicKey,
      signaturePublicKey: verifyingKey,
      wantsServerCustody,
      allowsAnalytics,
    });
    saveAuthToken({
      value: data.value,
      expiresAt: new Date(data.expiresAt),
    });

    let backupData = createBackup();
    if (!backupData) {
      console.error("Error creating backup!");
      toast.error("Error creating backup! Please try again.");
      return;
    }

    // Encrypt backup data if user wants self custody
    const backup = wantsServerCustody
      ? backupData
      : encryptBackupString(backupData, email, password);

    const backupResponse = await fetch("/api/backup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        backup,
        wantsServerCustody,
        authToken: data.value,
      }),
    });

    if (!backupResponse.ok) {
      console.error(`HTTP error! status: ${backupResponse.status}`);
      toast.error("Error storing backup! Please try again.");
      return;
    }

    // Send a jubSignal message to self to store the signature
    const dataToSign = uuidv4().replace(/-/g, ""); // For now, we just sign a random uuid as a hex string
    const signature = sign(signingKey, dataToSign);
    const recipientPublicKey = publicKey;
    const encryptedMessage = await encryptRegisteredMessage({
      signaturePublicKey: verifyingKey,
      signatureMessage: dataToSign,
      signature,
      senderPrivateKey: privateKey,
      recipientPublicKey,
    });
    try {
      await loadMessages({
        forceRefresh: false,
        messageRequests: [
          {
            encryptedMessage,
            recipientPublicKey,
          },
        ],
      });
    } catch (error) {
      console.error("Error sending registration tap to server: ", error);
      toast.error("An error occured while registering.");
      return;
    }

    toast.success("Account created and backed up!");
    router.push("/");
  };

  if (displayState === DisplayState.DISPLAY) {
    return (
      <FormStepLayout
        title="Welcome to Cursive Quests"
        description={new Date().toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
        })}
        className="pt-4"
        onSubmit={handleSubmit}
      >
        <Button type="submit">Continue</Button>
        <span className="text-center text-sm" onClick={handleCreateWithEmail}>
          <u>Create account with email and password</u>
        </span>
        <Link href="/login" className="link text-center">
          I already have an account
        </Link>
      </FormStepLayout>
    );
  } else if (displayState === DisplayState.INPUT_EMAIL) {
    return (
      <FormStepLayout
        title="Welcome to Cursive Quests"
        description={new Date().toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
        })}
        className="pt-4"
        onSubmit={handleSubmitWithEmail}
      >
        <Input
          type="email"
          id="email"
          label="Email"
          placeholder="bob.smith@gmail.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          type="password"
          id="password"
          label="Password"
          placeholder="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Input
          type="password"
          id="confirmPassword"
          label="Confirm Password"
          placeholder="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
        <Button type="submit">Create Account</Button>
        <span className="text-center text-sm" onClick={handleCreateWithPasskey}>
          <u>Create account with passkey</u>
        </span>
      </FormStepLayout>
    );
  }
}

Register.getInitialProps = () => {
  return { fullPage: true };
};
