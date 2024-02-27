import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/server/prisma";
import { object, string, boolean } from "yup";
import { ErrorResponse } from "@/types";
import { AuthTokenResponse, generateAuthToken } from "@/lib/server/auth";

const createAccountSchema = object({
  email: string().required(),
  displayName: string().required(),
  wantsServerCustody: boolean().required(),
  allowsAnalytics: boolean().required(),
  encryptionPublicKey: string().required(),
  signaturePublicKey: string().required(),
  passwordSalt: string().optional().default(undefined),
  passwordHash: string().optional().default(undefined),
  authPublicKey: string().optional().default(undefined),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AuthTokenResponse | ErrorResponse>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  let validatedData;
  try {
    validatedData = await createAccountSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });
  } catch (error) {
    console.error("Account creation failed", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }

  if (!validatedData) {
    return res.status(500).json({ error: "Internal Server Error" });
  }

  const {
    email,
    displayName,
    wantsServerCustody,
    allowsAnalytics,
    encryptionPublicKey,
    signaturePublicKey,
    passwordSalt,
    passwordHash,
    authPublicKey,
  } = validatedData;

  const existingUser = await prisma.user.findUnique({
    where: {
      email,
    },
  });
  if (existingUser) {
    return res.status(400).json({ error: "Card already registered" });
  }

  if (authPublicKey) {
    const authPublicKeyUser = await prisma.user.findFirst({
      where: {
        authPublicKey,
      },
    });
    if (authPublicKeyUser) {
      return res.status(400).json({ error: "Card already registered" });
    }
  }

  // Create user
  const user = await prisma.user.create({
    data: {
      chipId: email,
      email,
      displayName,
      wantsServerCustody,
      allowsAnalytics,
      encryptionPublicKey,
      signaturePublicKey,
      passwordSalt,
      passwordHash,
      authPublicKey,
    },
  });

  const authTokenResponse = await generateAuthToken(user.id);

  return res.status(200).json(authTokenResponse);
}
