import {
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

export function hasR2Credentials(): boolean {
  return Boolean(
    process.env.R2_ACCOUNT_ID &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY &&
      process.env.R2_BUCKET_NAME,
  );
}

export function getR2Client(): S3Client | null {
  if (!hasR2Credentials()) return null;
  return new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
}

export async function putR2Object(params: {
  key: string;
  body: Buffer;
  contentType: string;
}): Promise<void> {
  const client = getR2Client();
  if (!client) throw new Error("R2 憑證未設定");

  await client.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: params.key,
      Body: params.body,
      ContentType: params.contentType,
    }),
  );
}

export type R2BucketUsage = {
  configured: boolean;
  bucket: string | null;
  objectCount: number;
  usedBytes: number;
};

/** 列出 bucket 內物件總數與總位元組（分頁加總）。 */
export async function getR2BucketUsage(): Promise<R2BucketUsage> {
  const client = getR2Client();
  const bucket = process.env.R2_BUCKET_NAME ?? null;
  if (!client || !bucket) {
    return {
      configured: false,
      bucket,
      objectCount: 0,
      usedBytes: 0,
    };
  }

  let objectCount = 0;
  let usedBytes = 0;
  let continuationToken: string | undefined;

  do {
    const res = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        ContinuationToken: continuationToken,
        MaxKeys: 1000,
      }),
    );
    for (const obj of res.Contents ?? []) {
      objectCount += 1;
      usedBytes += obj.Size ?? 0;
    }
    continuationToken = res.IsTruncated
      ? res.NextContinuationToken
      : undefined;
  } while (continuationToken);

  return {
    configured: true,
    bucket,
    objectCount,
    usedBytes,
  };
}
