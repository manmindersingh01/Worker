import bcrypt from "bcryptjs";
import { db } from "~/server/db";
import { DEMO_EMAIL, DEMO_NAME, DEMO_PASSWORD } from "~/server/auth/demo";

export async function hashPassword(pw: string) {
  return bcrypt.hash(pw, 10);
}

export async function ensureDemoUser() {
  const existing = await db.user.findUnique({ where: { email: DEMO_EMAIL } });
  if (existing) return existing;

  return db.user.create({
    data: {
      email: DEMO_EMAIL,
      name: DEMO_NAME,
      password: await hashPassword(DEMO_PASSWORD),
      credits: 300,
    },
  });
}

export async function verifyUserCredentials(email: string, password: string) {
  let user = await db.user.findUnique({ where: { email } });

  if (!user && email === DEMO_EMAIL) {
    user = await ensureDemoUser();
  }

  if (!user?.password) return null;

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return null;

  return { id: user.id, name: user.name, email: user.email, image: user.image };
}
