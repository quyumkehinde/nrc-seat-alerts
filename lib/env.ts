import 'server-only'

function required(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable ${name}. See .env.example.`)
  }
  return value
}

export const env = {
  get supabaseUrl() {
    return required('SUPABASE_URL')
  },
  get supabaseServiceRoleKey() {
    return required('SUPABASE_SERVICE_ROLE_KEY')
  },
  get resendApiKey() {
    return required('RESEND_API_KEY')
  },
  /** Falls back to Resend's shared test sender, which only reaches your own address. */
  get emailFrom() {
    return process.env.EMAIL_FROM || 'NRC Seat Alerts <onboarding@resend.dev>'
  },
  get siteUrl() {
    return (process.env.SITE_URL || 'http://localhost:3000').replace(/\/$/, '')
  },
  /** Shared with the cron trigger. Absent is only tolerable in dev. */
  get cronSecret() {
    return process.env.CRON_SECRET
  },
  get isProduction() {
    return process.env.NODE_ENV === 'production'
  },
}
