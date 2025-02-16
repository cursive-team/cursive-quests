import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/server/prisma";
import { object, string, boolean } from "yup";
import { EmptyResponse, ErrorResponse } from "@/types";
import { verifyAuthToken } from "@/lib/server/auth";
import { displayNameRegex } from "@/lib/shared/utils";

const updateProfileSchema = object({
  authToken: string().required(),
  displayName: string().optional(),
  wantsServerCustody: boolean().optional(),
  allowsAnalytics: boolean().optional(),
  passwordSalt: string().optional(),
  passwordHash: string().optional(),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<EmptyResponse | ErrorResponse>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  let validatedData;
  try {
    validatedData = await updateProfileSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });
  } catch (error) {
    console.error("Profile update failed", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }

  if (!validatedData) {
    return res.status(500).json({ error: "Internal Server Error" });
  }

  const {
    authToken,
    displayName,
    wantsServerCustody,
    allowsAnalytics,
    passwordSalt,
    passwordHash,
  } = validatedData;

  if (displayName && !displayNameRegex.test(displayName)) {
    return res.status(400).json({
      error:
        "Invalid display name. Must be alphanumeric and less than 20 characters",
    });
  }

  // Update user
  const userId = await verifyAuthToken(authToken);
  if (!userId) {
    return res.status(400).json({ error: "Invalid token" });
  }

  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
  });
  if (!user) {
    return res.status(400).json({ error: "User not found" });
  }

  try {
    await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        displayName: displayName,
        wantsServerCustody: wantsServerCustody,
        allowsAnalytics: allowsAnalytics,
        passwordSalt: passwordSalt,
        passwordHash: passwordHash,
      },
    });
  } catch (error) {
    console.error("Failed to update user profile", error);
    return res.status(500).json({ error: "Failed to update user profile" });
  }

  return res.status(200).json({});
}
