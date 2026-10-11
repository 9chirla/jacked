-- Paste into Supabase SQL Editor after migration to verify grants/policies.
select tablename, rowsecurity
from pg_tables
where schemaname = 'public' and tablename in ('profile', 'equipment', 'goal');

select grantee, table_name, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in ('profile', 'equipment', 'goal')
order by table_name, grantee, privilege_type;

select tablename, policyname, cmd, roles
from pg_policies
where schemaname = 'public'
  and tablename in ('profile', 'equipment', 'goal')
order by tablename, policyname;
