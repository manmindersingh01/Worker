import { randomUUID } from "node:crypto";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

function loadEnv() {
  // require lazily so importing this module does not trigger env validation
  // (e.g. in tests that only exercise the pure key builder).

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require("~/server/env").env as {
    AWS_REGION?: string;
    AWS_ACCESS_KEY_ID?: string;
    AWS_SECRET_ACCESS_KEY?: string;
    S3_BUCKET_NAME?: string;
  };
}

let s3Singleton: S3Client | undefined;

export function getS3Client(): S3Client {
  if (!s3Singleton) {
    const env = loadEnv();
    s3Singleton = new S3Client({
      region: env.AWS_REGION,
      credentials: {
        accessKeyId: env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY!,
      },
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
