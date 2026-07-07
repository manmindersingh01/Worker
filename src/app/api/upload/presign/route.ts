import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { buildObjectKey, presignPut } from "~/lib/s3";
import { db } from "~/server/db";
import { MAX_PDFS_PER_USER } from "~/lib/limits";

const MAX_SIZE = 32 * 1024 * 1024; // 32 MB

type IncomingFile = { name: string; type: string; size: number };

export async function POST(req: Request) {
  const data = await auth();
  const userId = data?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as { files?: IncomingFile[] };
  const files = body.files;

  if (!Array.isArray(files) || files.length === 0) {
    return NextResponse.json(
      { error: "INVALID_INPUT", message: "files must be a non-empty array" },
      { status: 400 },
    );
  }

  // FAILED uploads don't consume the user's quota — let them retry.
  const existing = await db.document.count({
    where: { userId, status: { not: "FAILED" } },
  });
  if (existing >= MAX_PDFS_PER_USER || files.length > MAX_PDFS_PER_USER - existing) {
    return NextResponse.json(
      { error: "PDF_LIMIT", message: `You can upload at most ${MAX_PDFS_PER_USER} PDFs.` },
      { status: 403 },
    );
  }

  for (const file of files) {
    const isPdf =
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      return NextResponse.json(
        { error: "INVALID_TYPE", message: "Only PDF files are allowed" },
        { status: 400 },
      );
    }
    if (typeof file.size !== "number" || file.size <= 0 || file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "FILE_TOO_LARGE", message: "Each file must be <= 32 MB" },
        { status: 400 },
      );
    }
  }

  const uploads = await Promise.all(
    files.map(async (file) => {
      const key = buildObjectKey(userId, file.name);
      const url = await presignPut(key, file.type);
      return { key, name: file.name, url };
    }),
  );

  return NextResponse.json({ uploads });
}
