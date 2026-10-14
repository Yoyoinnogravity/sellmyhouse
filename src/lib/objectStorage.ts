import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

function bucketName() {
  return process.env.NEON_ASSETS_BUCKET ?? "assets";
}

let client: S3Client | undefined;

export function storageEnabled() {
  return Boolean(
    process.env.AWS_ENDPOINT_URL_S3 &&
      process.env.AWS_ACCESS_KEY_ID &&
      process.env.AWS_SECRET_ACCESS_KEY,
  );
}

export function storageClient() {
  if (!client) {
    client = new S3Client({
      endpoint: process.env.AWS_ENDPOINT_URL_S3,
      region: process.env.AWS_REGION ?? "auto",
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "",
      },
      forcePathStyle: true,
    });
  }
  return client;
}

export async function putListingPhoto(name: string, bytes: Buffer, contentType: string) {
  await storageClient().send(
    new PutObjectCommand({
      Bucket: bucketName(),
      Key: `uploads/${name}`,
      Body: bytes,
      ContentType: contentType,
    }),
  );
}

export async function getListingPhoto(name: string) {
  try {
    const response = await storageClient().send(
      new GetObjectCommand({ Bucket: bucketName(), Key: `uploads/${name}` }),
    );
    const bytes = await response.Body?.transformToByteArray();
    if (!bytes) return null;
    return { bytes: Buffer.from(bytes), contentType: response.ContentType };
  } catch {
    return null;
  }
}

export async function deleteListingPhoto(name: string) {
  try {
    await storageClient().send(
      new DeleteObjectCommand({ Bucket: bucketName(), Key: `uploads/${name}` }),
    );
  } catch {
    // Already gone or never uploaded; local cleanup continues.
  }
}
