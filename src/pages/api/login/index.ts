import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/server/prisma";
import { ErrorResponse } from "../../../types";
import { generateAuthToken } from "@/lib/server/auth";
import { LoginResponse } from "./verify_code";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<LoginResponse | ErrorResponse>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { username } = req.body;
  if (!username) {
    return res.status(400).json({ error: "Username is required" });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: username },
    });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Generate auth token
    const authToken = await generateAuthToken(user.id);

    // Get latest backup
    const backup = await prisma.backup.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });
    if (!backup) {
      return res.status(404).json({ error: "Backup not found" });
    }

    const { encryptedData, authenticationTag, iv } = backup;

    if (!user.passwordSalt || !user.passwordHash) {
      return res.status(404).json({ error: "Password not found" });
    }

    const responseData: LoginResponse = {
      authToken,
      backup: {
        encryptedData,
        authenticationTag,
        iv,
      },
      password: {
        salt: user.passwordSalt,
        hash: user.passwordHash,
      },
    };
    return res.status(200).json(responseData);
  } catch (error) {
    console.error("Request error", error);
    return res.status(500).json({ error: "Error fetching user" });
  }
}
