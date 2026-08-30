import "server-only";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable ${name}. See .env.example.`,
    );
  }
  return value;
}

export const env = {
  get supabaseUrl() {
    return required("SUPABASE_URL");
  },
  /** Falls back to the legacy service_role key until it is retired. */
  get supabaseSecretKey() {
    const key = process.env.SUPABASE_SECRET_KEY;
    if (!key) throw new Error("Missing SUPABASE_SECRET_KEY. See .env.example.");
    return key;
  },
  get resendApiKey() {
    return required("RESEND_API_KEY");
  },
  /** Resend's test sender only delivers to your own account address. */
  get emailFrom() {
    return process.env.EMAIL_FROM || "NRC Seat Alerts <onboarding@resend.dev>";
  },
  get siteUrl() {
    return (process.env.SITE_URL || "http://localhost:3000").replace(/\/$/, "");
  },
  /** Shared with the cron trigger. Absent is only tolerable in dev. */
  get cronSecret() {
    return process.env.CRON_SECRET;
  },
  get isProduction() {
    return process.env.NODE_ENV === "production";
  },
};
