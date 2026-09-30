-- GridTMS private document storage notice
-- Run frontend/src/schema/account_isolation_migration.sql instead. It makes
-- the documents bucket private and limits each authenticated user to the
-- object folder named with their own Supabase Auth UUID.

select 'Run frontend/src/schema/account_isolation_migration.sql to secure document storage.' as status;
