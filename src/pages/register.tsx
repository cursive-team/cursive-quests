"use client";

import { Button } from "@/components/Button";
import { FormStepLayout } from "@/layouts/FormStepLayout";
import Link from "next/link";
import { useRouter } from "next/router";
import { FormEvent, useState } from "react";
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
import { Input } from "@/components/Input";

enum DisplayState {
  INPUT_EMAIL,
  INPUT_CODE,
  INPUT_SOCIAL,
  CHOOSE_CUSTODY,
  INPUT_PASSWORD,
  CREATING_ACCOUNT,
}

export const webauthnRegistrationOptions = {
  rpName: "cursive-quests",
  rpID: window.location.origin,
  userID: "user",
  userName: "username",
};

export const webauthnAuthenticationOptions = {
  rpID: window.location.origin,
};

export default function Register() {
  const router = useRouter();
  const [id, setId] = useState<string>("");
  const [publicKey, setPublicKey] = useState<string | undefined>("");
  const [displayState, setDisplayState] = useState<DisplayState>(
    DisplayState.INPUT_EMAIL
  );

  const handleSubmit = async (e: FormEvent<Element>) => {
    e.preventDefault();

    const registrationOptions = await generateRegistrationOptions(
      webauthnRegistrationOptions
    );
    const { id, response } = await startRegistration(registrationOptions);
    const publicKey = response.publicKey;
    setId(id);
    setPublicKey(publicKey);
  };

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
      <Input type="text" id="id" label="Id" value={id} />
      <Input type="text" id="publicKey" label="Public Key" value={publicKey} />
      <Button type="submit">Continue</Button>
      <Link href="/login" className="link text-center">
        I already have an account
      </Link>
    </FormStepLayout>
  );
}
