-- Run after the shim and migrations. Any failed check raises an error.
\set ON_ERROR_STOP on
insert into auth.users values ('00000000-0000-0000-0000-00000000000a'), ('00000000-0000-0000-0000-00000000000b');
insert into public.coaches (id, slug, name, first_name, active) values
  ('00000000-0000-0000-0000-00000000000a', 'david-tripp', 'David Tripp', 'David', true),
  ('00000000-0000-0000-0000-00000000000b', 'draft-coach', 'Draft Coach', 'Draft', false);
insert into public.google_tokens values ('00000000-0000-0000-0000-00000000000a', 'secret-refresh-token', 'd@example.com', now());
insert into public.availability_rules (coach_id, weekday, start_time, end_time)
  values ('00000000-0000-0000-0000-00000000000b', 2, '09:00', '11:00');

-- 1. Only one confirmed booking per slot.
insert into public.bookings (coach_id, start_at, end_at, reference, guest_name, guest_email, topic)
  values ('00000000-0000-0000-0000-00000000000a', '2026-10-20 13:00Z', '2026-10-20 13:30Z', 'CW-1', 'A', 'a@x.co', 't');
do $$ begin
  insert into public.bookings (coach_id, start_at, end_at, reference, guest_name, guest_email, topic)
    values ('00000000-0000-0000-0000-00000000000a', '2026-10-20 13:00Z', '2026-10-20 13:30Z', 'CW-2', 'B', 'b@x.co', 't');
  raise exception 'FAIL: double booking allowed';
exception when unique_violation then raise notice 'ok: second booking of same slot rejected';
end $$;
-- A cancelled booking frees the slot.
update public.bookings set status = 'cancelled' where reference = 'CW-1';
insert into public.bookings (coach_id, start_at, end_at, reference, guest_name, guest_email, topic)
  values ('00000000-0000-0000-0000-00000000000a', '2026-10-20 13:00Z', '2026-10-20 13:30Z', 'CW-3', 'C', 'c@x.co', 't');
\echo ok: cancelled slot can be booked again

-- 2. Anonymous visitors: active coaches only, nothing else.
set role anon;
do $$ begin
  if (select count(*) from public.coaches) <> 1 then raise exception 'FAIL: anon sees inactive coach'; end if;
  if (select count(*) from public.bookings) <> 0 then raise exception 'FAIL: anon sees bookings'; end if;
  if (select count(*) from public.availability_rules) <> 0 then raise exception 'FAIL: anon sees rules'; end if;
  raise notice 'ok: anon sees only active coaches';
end $$;
do $$ begin
  perform * from public.google_tokens;
  raise exception 'FAIL: anon can read google tokens';
exception when insufficient_privilege then raise notice 'ok: anon cannot read google tokens';
end $$;
reset role;

-- 3. Signed-in coach B: own rows only, cannot touch tokens or create bookings.
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
do $$ begin
  if (select count(*) from public.availability_rules) <> 1 then raise exception 'FAIL: coach cannot see own rules'; end if;
  if (select count(*) from public.bookings) <> 0 then raise exception 'FAIL: coach sees another coach''s bookings'; end if;
  if (select count(*) from public.coaches where id = '00000000-0000-0000-0000-00000000000b') <> 1 then
    raise exception 'FAIL: coach cannot see own inactive profile'; end if;
  raise notice 'ok: coach sees own rules and profile, not others'' bookings';
end $$;
insert into public.availability_rules (coach_id, weekday, start_time, end_time)
  values ('00000000-0000-0000-0000-00000000000b', 4, '14:00', '16:00');
\echo ok: coach can add own rule
do $$ begin
  insert into public.availability_rules (coach_id, weekday, start_time, end_time)
    values ('00000000-0000-0000-0000-00000000000a', 4, '14:00', '16:00');
  raise exception 'FAIL: coach added a rule for another coach';
exception when insufficient_privilege then raise notice 'ok: coach cannot add rules for another coach';
end $$;
do $$ begin
  update public.coaches set name = 'Hacked' where id = '00000000-0000-0000-0000-00000000000a';
  if (select name from public.coaches where id = '00000000-0000-0000-0000-00000000000a') = 'Hacked' then
    raise exception 'FAIL: coach edited another profile'; end if;
  raise notice 'ok: coach cannot edit another profile';
end $$;
do $$ begin
  insert into public.bookings (coach_id, start_at, end_at, reference, guest_name, guest_email, topic)
    values ('00000000-0000-0000-0000-00000000000b', '2026-10-21 13:00Z', '2026-10-21 13:30Z', 'CW-9', 'X', 'x@x.co', 't');
  raise exception 'FAIL: client inserted a booking directly';
exception when insufficient_privilege then raise notice 'ok: bookings can only be created by the server';
end $$;
do $$ begin
  perform * from public.google_tokens;
  raise exception 'FAIL: coach can read google tokens';
exception when insufficient_privilege then raise notice 'ok: coach cannot read google tokens';
end $$;
reset role;
\echo ALL RLS CHECKS PASSED
