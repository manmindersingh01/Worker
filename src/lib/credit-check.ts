// lib/credit-check.ts
import { db } from "~/server/db";

export class InsufficientCreditsError extends Error {
  constructor() {
    super("INSUFFICIENT_CREDITS");
    this.name = "InsufficientCreditsError";
  }
}

export async function checkAndUpdateCredits(
  userId: string,
  messageLength: number,
) {
  console.log("credit check started for:", userId, messageLength);

  // Get current user credits
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { credits: true },
  });

  if (!user) {
    throw new Error("User not found");
  }

  // Calculate token cost (1 token per character)
  const estimatedTokens = Math.ceil(messageLength);

  console.log(
    "Current credits:",
    user.credits,
    "Required tokens:",
    estimatedTokens,
  );

  // Check if user has enough credits
  if (user.credits < estimatedTokens) {
    throw new InsufficientCreditsError();
  }

  // Update user credits
  const updatedCredits = user.credits - estimatedTokens;
  await db.user.update({
    where: { id: userId },
    data: {
      credits: updatedCredits,
    },
  });

  return {
    remainingCredits: updatedCredits,
  };
}
