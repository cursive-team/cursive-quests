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

export default function Login() {
  const router = useRouter();

  const handleSubmit = async (e: FormEvent<Element>) => {
    e.preventDefault();

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
      return;
    }

    const username = sha256(id);
    await login(username, id);
  };

  const login = async (username: string, password: string) => {
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
      return;
    }

    const { authToken, backup, password: passwordData } = await response.json();
    if (!authToken) {
      console.error("No auth token found");
      toast.error("Error logging in. Please try again.");
      return;
    }

    const { passwordHash, passwordSalt } = passwordData;
    const derivedPasswordHash = await hashPassword(password, passwordSalt);
    if (derivedPasswordHash !== passwordHash) {
      toast.error("Incorrect password");
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
      return;
    }

    router.push("/");
  };

  return (
    <FormStepLayout
      title="Login to Cursive Quests"
      description={new Date().toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
      })}
      className="pt-4"
      onSubmit={handleSubmit}
    >
      <Button type="submit">Continue</Button>
      <Link href="/register" className="link text-center">
        I do not have an account
      </Link>
    </FormStepLayout>
  );
}

Login.getInitialProps = () => {
  return { fullPage: true };
};
