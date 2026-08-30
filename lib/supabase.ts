import 'server-only'
import { createClient } from '@supabase/supabase-js'
import { env } from './env.ts'

/** Secret key: bypasses RLS, must never reach the browser. */
export const db = createClient(env.supabaseUrl, env.supabaseSecretKey, {
  auth: { persistSession: false },
})

export const SUBSCRIPTIONS = 'subscriptions'

/** Postgres unique violation: already watching this trip. */
export const UNIQUE_VIOLATION = '23505'

export type Subscription = {
  id: string
  email: string
  from_station_id: string
  from_station_name: string
  to_station_id: string
  to_station_name: string
  travel_date: string
  /** '' = any train. */
  vehicle_code: string
  /** '' = any class. */
  coach_type_name: string
  token: string
  confirmed_at: string | null
  notified_at: string | null
}
