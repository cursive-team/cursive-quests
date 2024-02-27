import React, { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/router";
import { v4 as uuidv4 } from "uuid";
import { generateEncryptionKeyPair } from "@/lib/client/encryption";
import { generateSignatureKeyPair, sign } from "@/lib/shared/signature";
import { generateSalt, hashPassword } from "@/lib/client/utils";
import {
  createBackup,
  deleteAccountFromLocalStorage,
  loadBackup,
  saveAuthToken,
  saveKeys,
  saveProfile,
} from "@/lib/client/localStorage";
import { verifySigninCodeResponseSchema } from "../lib/server/auth";
import { decryptBackupString, encryptBackupString } from "@/lib/shared/backup";
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

export default function Login() {
  const router = useRouter();
  const [displayState, setDisplayState] = useState<DisplayState>(
    DisplayState.DISPLAY
  );
  const [email, setEmail] = useState<string>();
  const [password, setPassword] = useState<string>();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent<Element>) => {
    e.preventDefault();

    setLoading(true);

    const authenticationOptions = await generateAuthenticationOptions({
      rpID: window.location.hostname,
    });

    let id;
    try {
      const { id: authId } = await startAuthentication(authenticationOptions);
      id = authId;
    } catch (error) {
      console.error("Error logging in: ", error);
      toast.error("Authentication failed! Please try again.");
      setLoading(false);
      return;
    }

    toast.info("Your id: " + id);

    const username = sha256(id);
    await login(username, id);
  };

  const handleSubmitWithEmail = async (e: FormEvent<Element>) => {
    e.preventDefault();
    setLoading(true);

    if (!email || !password) {
      toast.error("Please enter your email and password");
      setLoading(false);
      return;
    }

    await login(email, password);
  };

  const login = async (username: string, password: string) => {
    setLoading(true);
    const response = await fetch("/api/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username }),
    });

    if (!response.ok) {
      console.error("Error logging in");
      toast.error("Error logging in. Please try again.");
      setLoading(false);
      return;
    }

    const { authToken, backup, password: passwordData } = await response.json();
    if (!authToken) {
      console.error("No auth token found");
      toast.error("Error logging in. Please try again.");
      setLoading(false);
      return;
    }

    const { salt, hash } = passwordData;
    const derivedPasswordHash = await hashPassword(password, salt);
    if (derivedPasswordHash !== hash) {
      toast.error("Incorrect password");
      setLoading(false);
      return;
    }

    const { encryptedData, authenticationTag, iv } = backup;
    const decryptedBackupData = decryptBackupString(
      encryptedData,
      authenticationTag,
      iv,
      username,
      password
    );

    // Populate localStorage with auth and backup data to load messages
    saveAuthToken(authToken);
    loadBackup(decryptedBackupData);

    try {
      await loadMessages({ forceRefresh: true });
    } catch (error) {
      deleteAccountFromLocalStorage();
      toast.error("Error logging in. Please try again.");
      setLoading(false);
      return;
    }

    setLoading(false);
    router.push("/");
  };

  if (displayState === DisplayState.DISPLAY) {
    return (
      <FormStepLayout
        title="Login to Cursive Quests"
        // description={new Date().toLocaleDateString("en-US", {
        //   month: "long",
        //   day: "numeric",
        // })}
        description="A magical journey awaits..."
        className="pt-4"
        onSubmit={handleSubmit}
      >
        <Button type="submit">{loading ? "Logging in..." : "Login"}</Button>
        <span
          className="text-center text-sm"
          onClick={() => setDisplayState(DisplayState.INPUT_EMAIL)}
        >
          <u>Login with email and password</u>
        </span>
        <Link href="/register" className="link text-center">
          I do not have an account
        </Link>
      </FormStepLayout>
    );
  } else if (displayState === DisplayState.INPUT_EMAIL) {
    return (
      <FormStepLayout
        title="Login to Cursive Quests"
        // description={new Date().toLocaleDateString("en-US", {
        //   month: "long",
        //   day: "numeric",
        // })}
        description="A magical journey awaits..."
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
        <Button type="submit">{loading ? "Logging in..." : "Login"}</Button>
        <span
          className="text-center text-sm"
          onClick={() => setDisplayState(DisplayState.DISPLAY)}
        >
          <u>Login with passkey</u>
        </span>
        <Link href="/register" className="link text-center">
          I do not have an account
        </Link>
      </FormStepLayout>
    );
  }
}

Login.getInitialProps = () => {
  return { fullPage: true };
};
