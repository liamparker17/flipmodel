import { scrypt, randomBytes, timingSafeEqual } from "crypto";

/**
 * Password hashing using Node.js built-in crypto.scrypt.
 * No third-party dependencies — works reliably in all environments
 * including Turbopack, Vercel serverless, and edge functions.
 *
 * Format: scrypt:<salt>:<hash>
 */

const SCRYPT_KEYLEN = 64;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const hash = await new Promise<string>((resolve, reject) => {
    scrypt(password, salt, SCRYPT_KEYLEN, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey.toString("hex"));
    });
  });
  return `scrypt:${salt}:${hash}`;
}

export async function verifyPassword(
  password: string,
  stored: string
): Promise<boolean> {
  // Support legacy bcrypt hashes (prefix $2a$ or $2b$)
  if (stored.startsWith("$2a$") || stored.startsWith("$2b$")) {
    // Dynamically import bcryptjs only for legacy hashes
    try {
      const bcrypt = await import("bcryptjs");
      return bcrypt.default.compare(password, stored);
    } catch {
      // If bcryptjs import fails in bundled env, fall through
      return false;
    }
  }

  // Native scrypt format: scrypt:<salt>:<hash>
  if (!stored.startsWith("scrypt:")) return false;

  const [, salt, hash] = stored.split(":");
  if (!salt || !hash) return false;

  const derivedKey = await new Promise<Buffer>((resolve, reject) => {
    scrypt(password, salt, SCRYPT_KEYLEN, (err, key) => {
      if (err) reject(err);
      else resolve(key);
    });
  });

  const storedKey = Buffer.from(hash, "hex");
  if (derivedKey.length !== storedKey.length) return false;

  return timingSafeEqual(derivedKey, storedKey);
}
