import { randomBytes } from "crypto";

export function generateReferralCode(): string {
  return randomBytes(4).toString("hex");
}

export function getReferralUrl(code: string): string {
  return `${process.env.NEXT_PUBLIC_APP_URL || "https://grantaq.com"}/ref/${code}`;
}
