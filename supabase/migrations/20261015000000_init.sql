-- Coffee with the Coach: coaches publish weekly availability; customers book
-- 30-minute slots from it. Bookings and Google tokens are only written by the
-- server functions (service role); coaches manage their own rows via RLS.

-- Coaches ---------------------------------------------------------------------

create table public.coaches (
  id uuid primary key references auth.users (id) on delete cascade,
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null,
  first_name text not null,
  credential text not null default '',
  time_zone text not null default 'America/New_York',
  session_minutes int not null default 30 check (session_minutes between 15 and 120),
  buffer_minutes int not null default 0 check (buffer_minutes between 0 and 60),
  min_notice_hours int not null default 12 check (min_notice_hours between 0 and 336),
  booking_window_days int not null default 60 check (booking_window_days between 1 and 365),
  calendar_id text not null default 'primary',
  calendar_connected boolean not null default false,
  active boolean not null default false,
  created_at timestamptz not null default now()
);

-- Refresh token for the coach's Google Calendar. RLS is on with no policies and
-- grants are revoked, so only the server functions (service role) can read it.
create table public.google_tokens (
  coach_id uuid primary key references public.coaches (id) on delete cascade,
  refresh_token text not null,
  google_email text,
  updated_at timestamptz not null default now()
);

-- Availability ----------------------------------------------------------------

-- A weekly repeating window in the coach's timezone, sliced into sessions.
create table public.availability_rules (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.coaches (id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6), -- 0 = Sunday
  start_time time not null,
  end_time time not null,
  starts_on date not null default current_date,
  ends_on date,
  created_at timestamptz not null default now(),
  check (end_time > start_time),
  check (ends_on is null or ends_on >= starts_on)
);
create index on public.availability_rules (coach_id);

-- A single occurrence the coach removed from a repeating window.
create table public.availability_exceptions (
  coach_id uuid not null references public.coaches (id) on delete cascade,
  start_at timestamptz not null,
  primary key (coach_id, start_at)
);

-- Bookings --------------------------------------------------------------------

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.coaches (id) on delete cascade,
  start_at timestamptz not null,
  end_at timestamptz not null,
  status text not null default 'confirmed' check (status in ('confirmed', 'cancelled')),
  reference text not null unique,
  guest_name text not null,
  guest_email text not null,
  guest_phone text,
  guest_time_zone text,
  topic text not null,
  notes text check (char_length(notes) <= 500),
  google_event_id text,
  meet_link text,
  created_at timestamptz not null default now(),
  cancelled_at timestamptz,
  check (end_at > start_at)
);

-- A slot can be held by only one confirmed booking: this is what makes
-- "removed once booked" safe when two people tap the same time at once.
create unique index bookings_one_per_slot on public.bookings (coach_id, start_at)
  where status = 'confirmed';
create index on public.bookings (coach_id, start_at);

-- Row level security ----------------------------------------------------------

alter table public.coaches enable row level security;
alter table public.availability_rules enable row level security;
alter table public.availability_exceptions enable row level security;
alter table public.bookings enable row level security;
alter table public.google_tokens enable row level security;
revoke all on public.google_tokens from anon, authenticated;

-- Anyone can list active coaches; a coach can read and edit their own profile.
create policy "active coaches are public" on public.coaches
  for select using (active or id = auth.uid());
create policy "coach creates own profile" on public.coaches
  for insert with check (id = auth.uid());
create policy "coach updates own profile" on public.coaches
  for update using (id = auth.uid()) with check (id = auth.uid());

create policy "coach manages own rules" on public.availability_rules
  for all using (coach_id = auth.uid()) with check (coach_id = auth.uid());

create policy "coach manages own exceptions" on public.availability_exceptions
  for all using (coach_id = auth.uid()) with check (coach_id = auth.uid());

-- Coaches see their bookings; inserts and cancellations go through functions.
create policy "coach reads own bookings" on public.bookings
  for select using (coach_id = auth.uid());
