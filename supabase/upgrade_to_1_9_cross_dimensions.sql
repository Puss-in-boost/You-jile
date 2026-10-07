-- Run before deploying 1.9, on Supabase or the local PostgreSQL database.
-- Additive migration: historical amounts and categories remain unchanged.
begin;
alter table public.transactions add column if not exists merchant text not null default '';
alter table public.transactions add column if not exists detail text not null default '';
commit;
