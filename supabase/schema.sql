-- Run once in the Supabase SQL editor.

create table if not exists subscriptions (
  id                uuid primary key default gen_random_uuid(),
  email             text not null,

  from_station_id   uuid not null,
  from_station_name text not null,
  to_station_id     uuid not null,
  to_station_name   text not null,
  travel_date       date not null,

  -- '' means "any". Empty string rather than NULL so the unique index below
  -- catches duplicate signups (NULLs compare distinct).
  vehicle_code      text not null default '',
  coach_type_name   text not null default '',

  token             text not null unique,
  confirmed_at      timestamptz,
  notified_at       timestamptz,
  created_at        timestamptz not null default now()
);

create unique index if not exists subscriptions_unique_pref
  on subscriptions (
    lower(email), from_station_id, to_station_id,
    travel_date, vehicle_code, coach_type_name
  );

-- The poller's hot path.
create index if not exists subscriptions_pending
  on subscriptions (travel_date)
  where confirmed_at is not null and notified_at is null;

-- All access goes through the service-role key in API routes.
alter table subscriptions enable row level security;
