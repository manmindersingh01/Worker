import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { db } from "~/server/db";
import { DEMO_EMAIL, DEMO_PASSWORD } from "~/server/auth/demo";

export async function hashPassword(pw: string) {
  return bcrypt.hash(pw, 10);
}

/**
 * Create a fresh, isolated guest account. Used for the shared public demo
 * login: every demo sign-in gets its OWN user, so concurrent visitors never
 * share documents/chats or collide on the per-user usage limits.
 */
export async function createGuestUser() {
  return db.user.create({
    data: {
      email: `guest-${randomUUID()}@demo.levia`,
      name: "Guest",
    },
  });
}

export async function verifyUserCredentials(email: string, password: string) {
  const normalized = email.trim().toLowerCase();

  // Shared demo credentials → spin up a brand-new guest sandbox each time.
  if (normalized === DEMO_EMAIL && password === DEMO_PASSWORD) {
    const guest = await createGuestUser();
    return {
      id: guest.id,
      name: guest.name,
      email: guest.email,
      image: guest.image,
    };
  }

  // Real accounts: verify against the stored bcrypt hash.
  const user = await db.user.findUnique({ where: { email: normalized } });
  if (!user?.password) return null;

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return null;

  return { id: user.id, name: user.name, email: user.email, image: user.image };
}
