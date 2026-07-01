/**
 * Seed a pre-loaded CDSCO demo package.
 *
 * Builds a realistic (fictional) clinical-trial site package as real PDFs,
 * uploads them to S3, and runs the app's REAL ingestion pipeline (parse ->
 * chunk -> embed -> Pinecone + Postgres) against a dedicated demo user. The
 * result is a ready-to-open session where "Run readiness check" produces a
 * grounded, not-ready score with clickable, page-accurate citations - no
 * uploading required during the demo.
 *
 * Because it runs the real pipeline, it needs the same env as the app
 * (DATABASE_URL, S3, OPENAI_API_KEY, PINECONE_API_KEY, ...) and the readiness
 * migration must already be applied.
 *
 *   npm run seed:readiness
 *
 * Re-running is idempotent: the previous demo package for this user is removed
 * first. All names/numbers in the package are invented.
 */
import { db } from "../../src/server/db";
import { buildObjectKey, putObject, deleteObject } from "../../src/lib/s3";
import { ingestDocumentById } from "../../src/lib/rag/ingestDocument";
import { deleteByDocument, namespaceFor } from "../../src/lib/rag/pinecone";
import { hashPassword } from "../../src/server/auth/users";
import { makePdf } from "./pdf";
import { cdscoDemoPackage } from "./package";

const DEMO_EMAIL = "cdsco-demo@nextrial.demo";
const DEMO_PASSWORD = "readiness-demo-2019";
const DEMO_NAME = "CDSCO Demo (NexTrial)";
const SESSION_TITLE = "CDSCO Demo - Site 07 (Protocol NX-2025-07)";

async function upsertDemoUser() {
  const password = await hashPassword(DEMO_PASSWORD);
  const existing = await db.user.findUnique({ where: { email: DEMO_EMAIL } });
  if (existing) {
    return db.user.update({
      where: { id: existing.id },
      data: { password, credits: Math.max(existing.credits, 2000) },
    });
  }
  return db.user.create({
    data: { email: DEMO_EMAIL, name: DEMO_NAME, password, credits: 2000 },
  });
}

/** Remove any prior demo package for this user so re-runs stay clean. */
async function cleanupPrevious(userId: string) {
  const sessions = await db.pdfChatSession.findMany({
    where: { userId, title: SESSION_TITLE },
    include: { documents: true },
  });
  for (const session of sessions) {
    for (const doc of session.documents) {
      try {
        await deleteByDocument(namespaceFor(userId), doc.id);
      } catch {
        /* best effort */
      }
      try {
        await deleteObject(doc.url);
      } catch {
        /* best effort */
      }
    }
    await db.pdfChatSession.delete({ where: { id: session.id } });
    console.log(`  cleaned previous session ${session.id}`);
  }
}

async function main() {
  console.log("Seeding CDSCO readiness demo package...\n");

  const user = await upsertDemoUser();
  console.log(`Demo user: ${user.email} (${user.id})`);

  await cleanupPrevious(user.id);

  const session = await db.pdfChatSession.create({
    data: { userId: user.id, title: SESSION_TITLE },
  });
  console.log(`Created session ${session.id}\n`);

  let ready = 0;
  for (const spec of cdscoDemoPackage) {
    process.stdout.write(`  ${spec.fileName} ... `);
    const buffer = await makePdf(spec);
    const key = buildObjectKey(user.id, spec.fileName);
    await putObject(key, buffer, "application/pdf");

    const doc = await db.document.create({
      data: {
        pdfChatSessionId: session.id,
        userId: user.id,
        name: spec.fileName,
        url: key,
        status: "PROCESSING",
      },
    });

    try {
      await ingestDocumentById(doc.id);
      const fresh = await db.document.findUnique({ where: { id: doc.id } });
      if (fresh?.status === "READY") {
        ready += 1;
        console.log(`ready (${fresh.pageCount ?? "?"} pages)`);
      } else {
        console.log(`FAILED: ${fresh?.error ?? "unknown"}`);
      }
    } catch (err) {
      console.log(`FAILED: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  console.log(
    `\nDone. ${ready}/${cdscoDemoPackage.length} documents indexed.\n`,
  );
  console.log("Open the demo:");
  console.log(`  1. Sign in as   ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
  console.log(`  2. Go to        /pdfchat/${session.id}`);
  console.log(`  3. Switch to the Readiness tab and click "Run readiness check".`);
}

main()
  .catch((err) => {
    console.error("\nSeed failed:", err);
    process.exitCode = 1;
  })
  .finally(() => {
    void db.$disconnect();
  });
