-- 又寄了 Release Candidate — fresh Supabase schema.
-- 一级分类用于统计；subcategory 用于更细的消费分析。
-- 浏览器只使用 publishable key，RLS 必须保持开启。

create table public.transactions (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 type text not null check (type in ('expense','income')),
 amount numeric(12,2) not null check (amount > 0),
 category text not null check (category in ('餐饮','交通','娱乐','购物','居住','生活缴费','订阅服务','医疗','学习','旅行','收入','其他')),
 subcategory text not null default '',
 emoji text not null,
 title text not null check (char_length(trim(title)) between 1 and 120),
 transaction_date date not null,
 source text not null default 'manual' check (source in ('text','manual','voice','photo')),
 account text not null default '未指定' check (account in ('未指定','微信','支付宝','银行卡','现金','其他')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

create index transactions_user_date_idx on public.transactions(user_id, transaction_date desc);

create table public.user_category_rules (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 keyword text not null check (char_length(trim(keyword)) between 1 and 120),
 normalized_keyword text not null check (char_length(normalized_keyword) between 1 and 120),
 category text not null check (category in ('餐饮','交通','娱乐','购物','居住','生活缴费','订阅服务','医疗','学习','旅行','收入','其他')),
 subcategory text not null default '',
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

create unique index rules_user_keyword_idx on public.user_category_rules(user_id, normalized_keyword);

alter table public.transactions enable row level security;
alter table public.transactions force row level security;
alter table public.user_category_rules enable row level security;
alter table public.user_category_rules force row level security;

revoke all on public.transactions, public.user_category_rules from anon;
grant select, insert, update, delete on public.transactions, public.user_category_rules to authenticated;

create policy transactions_select on public.transactions for select to authenticated using ((select auth.uid()) = user_id);
create policy transactions_insert on public.transactions for insert to authenticated with check ((select auth.uid()) = user_id);
create policy transactions_update on public.transactions for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy transactions_delete on public.transactions for delete to authenticated using ((select auth.uid()) = user_id);

create policy rules_select on public.user_category_rules for select to authenticated using ((select auth.uid()) = user_id);
create policy rules_insert on public.user_category_rules for insert to authenticated with check ((select auth.uid()) = user_id);
create policy rules_update on public.user_category_rules for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy rules_delete on public.user_category_rules for delete to authenticated using ((select auth.uid()) = user_id);

create function public.touch_updated_at() returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger transactions_updated_at before update on public.transactions for each row execute function public.touch_updated_at();
create trigger rules_updated_at before update on public.user_category_rules for each row execute function public.touch_updated_at();

alter table public.transactions replica identity full;
alter table public.user_category_rules replica identity full;
alter publication supabase_realtime add table public.transactions;
alter publication supabase_realtime add table public.user_category_rules;

-- Personal profile and private avatar storage
create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '又寄了用户' check (char_length(trim(display_name)) between 1 and 40),
  avatar_path text not null default '',
  default_account text not null default '未指定' check (default_account in ('未指定','微信','支付宝','银行卡','现金','其他')),
  currency text not null default 'CNY' check (currency in ('CNY')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.profiles force row level security;
revoke all on public.profiles from anon;
grant select, insert, update, delete on public.profiles to authenticated;

create policy profiles_select on public.profiles for select to authenticated using ((select auth.uid()) = user_id);
create policy profiles_insert on public.profiles for insert to authenticated with check ((select auth.uid()) = user_id);
create policy profiles_update on public.profiles for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy profiles_delete on public.profiles for delete to authenticated using ((select auth.uid()) = user_id);
create trigger profiles_updated_at before update on public.profiles for each row execute function public.touch_updated_at();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', false, 3145728, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=false, file_size_limit=excluded.file_size_limit, allowed_mime_types=excluded.allowed_mime_types;

create policy "avatars_select_own" on storage.objects for select to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatars_insert_own" on storage.objects for insert to authenticated
with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatars_update_own" on storage.objects for update to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatars_delete_own" on storage.objects for delete to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
