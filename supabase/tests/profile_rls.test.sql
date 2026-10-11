-- Structural RLS / grant assertions for Phase 2 tables.
-- Run via: supabase test db  (local) or review with verify_grants.sql on remote.

begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(9);

select has_table('public', 'profile');
select has_table('public', 'equipment');
select has_table('public', 'goal');

select is(
  (select relrowsecurity from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'profile'),
  true,
  'profile has RLS enabled'
);

select is(
  (select count(*)::int from information_schema.role_table_grants
    where table_schema = 'public' and table_name = 'profile' and grantee = 'anon'),
  0,
  'anon has zero grants on profile'
);

select is(
  (select count(*)::int from information_schema.role_table_grants
    where table_schema = 'public' and table_name = 'equipment' and grantee = 'anon'),
  0,
  'anon has zero grants on equipment'
);

select is(
  (select count(*)::int from information_schema.role_table_grants
    where table_schema = 'public' and table_name = 'goal' and grantee = 'anon'),
  0,
  'anon has zero grants on goal'
);

select ok(
  exists(
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'profile' and policyname = 'profile_select_own'
  ),
  'profile_select_own exists'
);

select ok(
  exists(
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'profile' and policyname = 'profile_update_own'
  ),
  'profile_update_own exists'
);

select * from finish();
rollback;
