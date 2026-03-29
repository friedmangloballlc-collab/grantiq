import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";

function getKey(): Buffer {
  const key = process.env.FIELD_ENCRYPTION_KEY;
  if (!key || key.length !== 64) {
    throw new Error("FIELD_ENCRYPTION_KEY must be a 64-char hex string (256-bit)");
  }
  return Buffer.from(key, "hex");
}

export interface EncryptedField {
  ciphertext: string;
  iv: string;
  tag: string;
  version: number;
}

export function encryptField(plaintext: string): EncryptedField {
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    ciphertext: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    version: 1,
  };
}

export function decryptField(field: EncryptedField): string {
  const decipher = createDecipheriv(ALGORITHM, getKey(), Buffer.from(field.iv, "base64"));
  decipher.setAuthTag(Buffer.from(field.tag, "base64"));
  return decipher.update(field.ciphertext, "base64", "utf8") + decipher.final("utf8");
}
