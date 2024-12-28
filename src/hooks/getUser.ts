import { redirect } from "next/navigation";
import { auth } from "~/server/auth";

//hook to get user session
export async function getUserSession() {
  const session = await auth();
  return session;
}
