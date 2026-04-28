import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

function getEncryptionKey() {
  const raw = process.env.APP_ENCRYPTION_KEY ?? process.env.NEXTAUTH_SECRET;

  if (!raw) {
    throw new Error("Missing required environment variable: APP_ENCRYPTION_KEY");
  }

  return createHash("sha256").update(raw).digest();
}

export function encryptString(value: string) {
  const key = getEncryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

export function decryptString(value: string) {
  const key = getEncryptionKey();
  const payload = Buffer.from(value, "base64");
  const iv = payload.subarray(0, 12);
  const tag = payload.subarray(12, 28);
  const encrypted = payload.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);

  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}
