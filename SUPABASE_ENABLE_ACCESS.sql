-- GridTMS account isolation notice
-- This filename remains only so older instructions do not enable unsafe access.
-- Run frontend/src/schema/account_isolation_migration.sql instead. It removes
-- legacy anonymous/full-access policies and restricts every row by owner_id.

select 'Run frontend/src/schema/account_isolation_migration.sql for secure per-account access.' as status;
