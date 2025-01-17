// // lib/credit-check.ts
import { db } from "~/server/db";

export async function checkAndUpdateCredits(
  userId: string,
  messageLength: number,
) {
  // Get current user credits
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { credits: true },
  });

  if (!user) throw new Error("User not found");

  // Calculate token cost (rough estimate: 1 token per 4 characters)
  const estimatedTokens = Math.ceil(messageLength / 1);

  // Check if user has enough credits
  if (user.credits < estimatedTokens) {
    throw new Error("INSUFFICIENT_CREDITS");
  }

  // Update user credits
  await db.user.update({
    where: { id: userId },
    data: {
      credits: {
        decrement: estimatedTokens,
      },
    },
  });

  return {
    remainingCredits: user.credits - estimatedTokens,
    tokensUsed: estimatedTokens,
  };
}
