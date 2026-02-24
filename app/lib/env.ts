function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optionalEnv(name: string, defaultValue: string = ""): string {
  return process.env[name] || defaultValue;
}

// Validate and export all environment variables
// Only validate on server side
export const env = {
  // Database
  DATABASE_URL: requireEnv("DATABASE_URL"),

  // Auth
  NEXTAUTH_SECRET: requireEnv("NEXTAUTH_SECRET"),
  NEXTAUTH_URL: optionalEnv("NEXTAUTH_URL", "http://localhost:3000"),

  // Google OAuth
  GOOGLE_CLIENT_ID: optionalEnv("GOOGLE_CLIENT_ID"),
  GOOGLE_CLIENT_SECRET: optionalEnv("GOOGLE_CLIENT_SECRET"),

  // Accounting (optional)
  XERO_CLIENT_ID: optionalEnv("XERO_CLIENT_ID"),
  XERO_CLIENT_SECRET: optionalEnv("XERO_CLIENT_SECRET"),
  QUICKBOOKS_CLIENT_ID: optionalEnv("QUICKBOOKS_CLIENT_ID"),
  QUICKBOOKS_CLIENT_SECRET: optionalEnv("QUICKBOOKS_CLIENT_SECRET"),
  QUICKBOOKS_SANDBOX: optionalEnv("QUICKBOOKS_SANDBOX", "false"),
} as const;
