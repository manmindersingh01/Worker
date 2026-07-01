import { randomUUID } from "node:crypto";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

type S3Env = {
  AWS_REGION?: string;
  AWS_ACCESS_KEY_ID?: string;
  AWS_SECRET_ACCESS_KEY?: string;
  S3_BUCKET_NAME?: string;
};

function loadEnv(): S3Env {
  // require lazily so importing this module does not trigger env validation
  // (e.g. in tests that only exercise the pure key builder).
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("~/server/env").env as S3Env;
  } catch {
    // No CommonJS require in an ESM/tsx context (e.g. the readiness demo seed).
    // The values are already loaded onto process.env, so read them directly.
    return process.env as S3Env;
  }
}

let s3Singleton: S3Client | undefined;

export function getS3Client(): S3Client {
  if (!s3Singleton) {
    const env = loadEnv();
    // Use explicit keys only if BOTH are provided; otherwise fall back to the
    // default AWS credential provider chain (shared ~/.aws config + SSO profile
    // via AWS_PROFILE, env vars, or an IAM role). This lets the app use the
    // credentials the AWS CLI is already configured with.
    const hasExplicitKeys =
      !!env.AWS_ACCESS_KEY_ID && !!env.AWS_SECRET_ACCESS_KEY;
    s3Singleton = new S3Client({
      region: env.AWS_REGION ?? "us-east-1",
      ...(hasExplicitKeys
        ? {
            credentials: {
              accessKeyId: env.AWS_ACCESS_KEY_ID!,
              secretAccessKey: env.AWS_SECRET_ACCESS_KEY!,
            },
          }
        : {}),
    });
  }
  return s3Singleton;
}

/** Replace anything outside [alphanumeric . - _] with a dash. */
function sanitize(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9._-]+/g, "-");
}

/**
 * Build a collision-resistant, user-scoped S3 object key.
 * Shape: `uploads/<userId>/<uuid>-<sanitized-name>`.
 */
export function buildObjectKey(userId: string, fileName: string): string {
  return `uploads/${userId}/${randomUUID()}-${sanitize(fileName)}`;
}

export async function presignPut(
  key: string,
  contentType: string,
  client: S3Client = getS3Client(),
): Promise<string> {
  const env = loadEnv();
  return getSignedUrl(
    client,
    new PutObjectCommand({
      Bucket: env.S3_BUCKET_NAME,
      Key: key,
      ContentType: contentType,
    }),
    { expiresIn: 600 },
  );
}

export async function presignGet(
  key: string,
  client: S3Client = getS3Client(),
): Promise<string> {
  const env = loadEnv();
  return getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: env.S3_BUCKET_NAME, Key: key }),
    { expiresIn: 3600 },
  );
}

/**
 * Presign a GET url that browsers render inline as a PDF. Setting the response
 * content-type + inline disposition means an <iframe src="...#page=N"> lands on
 * the cited page using the browser's own PDF viewer - which is what makes the
 * "jump to the exact page" citation click actually work.
 */
export async function presignGetInline(
  key: string,
  client: S3Client = getS3Client(),
): Promise<string> {
  const env = loadEnv();
  return getSignedUrl(
    client,
    new GetObjectCommand({
      Bucket: env.S3_BUCKET_NAME,
      Key: key,
      ResponseContentType: "application/pdf",
      ResponseContentDisposition: "inline",
    }),
    { expiresIn: 3600 },
  );
}

/** Upload a buffer directly (server-side). Used by the demo package seed. */
export async function putObject(
  key: string,
  body: Buffer,
  contentType: string,
  client: S3Client = getS3Client(),
): Promise<void> {
  const env = loadEnv();
  await client.send(
    new PutObjectCommand({
      Bucket: env.S3_BUCKET_NAME,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
}

export async function getObjectBuffer(
  key: string,
  client: S3Client = getS3Client(),
): Promise<Buffer> {
  const env = loadEnv();
  const response = await client.send(
    new GetObjectCommand({ Bucket: env.S3_BUCKET_NAME, Key: key }),
  );
  if (!response.Body) {
    throw new Error(`S3 object has no body: ${key}`);
  }
  const bytes = await response.Body.transformToByteArray();
  return Buffer.from(bytes);
}

export async function deleteObject(
  key: string,
  client: S3Client = getS3Client(),
): Promise<void> {
  const env = loadEnv();
  try {
    await client.send(
      new DeleteObjectCommand({ Bucket: env.S3_BUCKET_NAME, Key: key }),
    );
  } catch {
    // ignore not-found / already-deleted
  }
}
