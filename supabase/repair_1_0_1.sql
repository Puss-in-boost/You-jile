-- 又寄了 Release Candidate — 旧 Supabase 项目一次性升级脚本
-- 适用于此前已经存在 transactions 的项目，也可重复执行。
-- 不删除账单；会把旧“咖啡饮品”一级分类迁入“餐饮 / 咖啡饮品”，
-- 并把旧版文字快速记账自动写入的“微信”改为“未指定”。

begin;

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  type text,
  amount numeric(12,2),
  category text,
  emoji text,
  title text,
  transaction_date date,
  source text,
  created_at timestamptz default now()
);

alter table public.transactions add column if not exists subcategory text;
alter table public.transactions add column if not exists account text;
alter table public.transactions add column if not exists updated_at timestamptz;

create table if not exists public.user_category_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  keyword text not null,
  normalized_keyword text not null,
  category text not null,
  subcategory text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_category_rules add column if not exists subcategory text;
alter table public.user_category_rules add column if not exists created_at timestamptz;
alter table public.user_category_rules add column if not exists updated_at timestamptz;

update public.transactions set account = '未指定' where account is null or trim(account) = '';
update public.transactions set subcategory = '' where subcategory is null;
update public.transactions set created_at = now() where created_at is null;
update public.transactions set updated_at = coalesce(updated_at, created_at, now()) where updated_at is null;
update public.transactions set source = 'manual' where source is null or trim(source) = '';

update public.user_category_rules set subcategory = '' where subcategory is null;
update public.user_category_rules set created_at = now() where created_at is null;
update public.user_category_rules set updated_at = coalesce(updated_at, created_at, now()) where updated_at is null;

-- 旧版本的“咖啡饮品”是一级分类；统一迁到餐饮下面。
update public.transactions
set category = '餐饮', subcategory = '咖啡饮品', emoji = '☕'
where category = '咖啡饮品';

update public.user_category_rules
set category = '餐饮', subcategory = '咖啡饮品'
where category = '咖啡饮品';

-- 尽可能补齐旧餐饮账单的细分类。
update public.transactions
set subcategory = '咖啡饮品', emoji = '☕'
where category = '餐饮' and coalesce(subcategory, '') = ''
  and lower(title) ~ '(咖啡|瑞幸|星巴克|拿铁|美式|生椰|manner|库迪|luckin)';

update public.transactions
set subcategory = '奶茶茶饮', emoji = '🧋'
where category = '餐饮' and coalesce(subcategory, '') = ''
  and title ~ '(奶茶|茶饮|果茶|喜茶|奈雪|茶百道|沪上阿姨)';

update public.transactions
set subcategory = '零食烘焙', emoji = '🥐'
where category = '餐饮' and coalesce(subcategory, '') = ''
  and title ~ '(零食|面包|蛋糕|甜品|烘焙|饼干)';

update public.transactions
set subcategory = '生鲜买菜', emoji = '🥬'
where category = '餐饮' and coalesce(subcategory, '') = ''
  and title ~ '(买菜|菜市场|生鲜|蔬菜|水果|肉菜)';

update public.transactions
set subcategory = '正餐', emoji = '🍜'
where category = '餐饮' and coalesce(subcategory, '') = '';

-- 只做一次的历史数据修复：V4 文字快速记账把未指定账户硬编码成微信。
-- 使用内部迁移标记，避免以后重复执行脚本时误伤用户明确输入的“微信”。
create table if not exists public.youjile_migrations (
  key text primary key,
  applied_at timestamptz not null default now()
);
alter table public.youjile_migrations enable row level security;
revoke all on public.youjile_migrations from anon, authenticated;

do $$
begin
  if not exists (
    select 1 from public.youjile_migrations where key = 'normalize_legacy_text_wechat_v1'
  ) then
    update public.transactions
    set account = '未指定'
    where source = 'text' and account = '微信';

    insert into public.youjile_migrations(key) values ('normalize_legacy_text_wechat_v1');
  end if;
end $$;

-- 旧数据不应存在无主账单；若存在则停止，避免把数据错误绑定给某个人。
do $$
begin
  if exists (select 1 from public.transactions where user_id is null) then
    raise exception '发现 user_id 为空的旧账单，请先确认这些账单属于哪个账号后再升级';
  end if;
  if exists (select 1 from public.transactions where amount is null or amount <= 0) then
    raise exception '发现金额为空或小于等于 0 的旧账单，请先修复后再升级';
  end if;
end $$;

-- 清理旧 CHECK，统一使用当前版本约束。
alter table public.transactions drop constraint if exists transactions_type_check;
alter table public.transactions drop constraint if exists transactions_amount_check;
alter table public.transactions drop constraint if exists transactions_category_check;
alter table public.transactions drop constraint if exists transactions_account_check;
alter table public.transactions drop constraint if exists transactions_source_check;
alter table public.transactions drop constraint if exists transactions_title_check;
alter table public.transactions drop constraint if exists category_emoji_check;
alter table public.user_category_rules drop constraint if exists user_category_rules_category_check;
alter table public.user_category_rules drop constraint if exists user_category_rules_keyword_check;
alter table public.user_category_rules drop constraint if exists user_category_rules_normalized_keyword_check;

alter table public.transactions
  alter column user_id set not null,
  alter column type set not null,
  alter column amount set not null,
  alter column category set not null,
  alter column subcategory set default '',
  alter column subcategory set not null,
  alter column emoji set not null,
  alter column title set not null,
  alter column transaction_date set not null,
  alter column source set default 'manual',
  alter column source set not null,
  alter column account set default '未指定',
  alter column account set not null,
  alter column created_at set default now(),
  alter column created_at set not null,
  alter column updated_at set default now(),
  alter column updated_at set not null;

alter table public.user_category_rules
  alter column subcategory set default '',
  alter column subcategory set not null,
  alter column created_at set default now(),
  alter column created_at set not null,
  alter column updated_at set default now(),
  alter column updated_at set not null;

alter table public.transactions
  add constraint transactions_type_check check (type in ('expense','income')),
  add constraint transactions_amount_check check (amount > 0),
  add constraint transactions_category_check check (category in ('餐饮','交通','娱乐','购物','居住','生活缴费','订阅服务','医疗','学习','旅行','收入','其他')),
  add constraint transactions_account_check check (account in ('未指定','微信','支付宝','银行卡','现金','其他')),
  add constraint transactions_source_check check (source in ('text','manual','voice','photo')),
  add constraint transactions_title_check check (char_length(trim(title)) between 1 and 120);

alter table public.user_category_rules
  add constraint user_category_rules_category_check check (category in ('餐饮','交通','娱乐','购物','居住','生活缴费','订阅服务','医疗','学习','旅行','收入','其他')),
  add constraint user_category_rules_keyword_check check (char_length(trim(keyword)) between 1 and 120),
  add constraint user_category_rules_normalized_keyword_check check (char_length(normalized_keyword) between 1 and 120);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.transactions'::regclass
      and contype = 'f'
      and conname = 'transactions_user_id_fkey'
  ) then
    alter table public.transactions
      add constraint transactions_user_id_fkey
      foreign key (user_id) references auth.users(id) on delete cascade;
  end if;
end $$;

create index if not exists transactions_user_date_idx
  on public.transactions(user_id, transaction_date desc);
create unique index if not exists rules_user_keyword_idx
  on public.user_category_rules(user_id, normalized_keyword);

alter table public.transactions enable row level security;
alter table public.transactions force row level security;
alter table public.user_category_rules enable row level security;
alter table public.user_category_rules force row level security;

revoke all on public.transactions, public.user_category_rules from anon;
grant select, insert, update, delete on public.transactions, public.user_category_rules to authenticated;

-- 用当前标准策略替换旧策略，避免历史名称/规则残留。
do $$
declare p record;
begin
  for p in select policyname from pg_policies where schemaname='public' and tablename='transactions' loop
    execute format('drop policy if exists %I on public.transactions', p.policyname);
  end loop;
  for p in select policyname from pg_policies where schemaname='public' and tablename='user_category_rules' loop
    execute format('drop policy if exists %I on public.user_category_rules', p.policyname);
  end loop;
end $$;

create policy transactions_select on public.transactions for select to authenticated using ((select auth.uid()) = user_id);
create policy transactions_insert on public.transactions for insert to authenticated with check ((select auth.uid()) = user_id);
create policy transactions_update on public.transactions for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy transactions_delete on public.transactions for delete to authenticated using ((select auth.uid()) = user_id);

create policy rules_select on public.user_category_rules for select to authenticated using ((select auth.uid()) = user_id);
create policy rules_insert on public.user_category_rules for insert to authenticated with check ((select auth.uid()) = user_id);
create policy rules_update on public.user_category_rules for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy rules_delete on public.user_category_rules for delete to authenticated using ((select auth.uid()) = user_id);

create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists transactions_updated_at on public.transactions;
create trigger transactions_updated_at before update on public.transactions
for each row execute function public.touch_updated_at();

drop trigger if exists rules_updated_at on public.user_category_rules;
create trigger rules_updated_at before update on public.user_category_rules
for each row execute function public.touch_updated_at();

alter table public.transactions replica identity full;
alter table public.user_category_rules replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='transactions'
  ) then
    alter publication supabase_realtime add table public.transactions;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='user_category_rules'
  ) then
    alter publication supabase_realtime add table public.user_category_rules;
  end if;
end $$;

commit;

-- =========================================================
-- You-jile 1.0: profile + avatar storage
-- Safe to run after the previous release upgrade; statements are idempotent.
-- =========================================================
begin;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  avatar_path text not null default '',
  default_account text not null default '未指定',
  currency text not null default 'CNY',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles add column if not exists display_name text;
alter table public.profiles add column if not exists avatar_path text;
alter table public.profiles add column if not exists default_account text;
alter table public.profiles add column if not exists currency text;
alter table public.profiles add column if not exists created_at timestamptz;
alter table public.profiles add column if not exists updated_at timestamptz;

update public.profiles set display_name = '又寄了用户' where display_name is null or trim(display_name) = '';
update public.profiles set avatar_path = '' where avatar_path is null;
update public.profiles set default_account = '未指定' where default_account is null or trim(default_account) = '';
update public.profiles set currency = 'CNY' where currency is null or trim(currency) = '';
update public.profiles set created_at = now() where created_at is null;
update public.profiles set updated_at = coalesce(updated_at, created_at, now()) where updated_at is null;

insert into public.profiles (user_id, display_name, default_account, currency)
select id, coalesce(nullif(split_part(email, '@', 1), ''), '又寄了用户'), '未指定', 'CNY'
from auth.users
on conflict (user_id) do nothing;

alter table public.profiles drop constraint if exists profiles_display_name_check;
alter table public.profiles drop constraint if exists profiles_default_account_check;
alter table public.profiles drop constraint if exists profiles_currency_check;

alter table public.profiles
  alter column display_name set default '又寄了用户',
  alter column display_name set not null,
  alter column avatar_path set default '',
  alter column avatar_path set not null,
  alter column default_account set default '未指定',
  alter column default_account set not null,
  alter column currency set default 'CNY',
  alter column currency set not null,
  alter column created_at set default now(),
  alter column created_at set not null,
  alter column updated_at set default now(),
  alter column updated_at set not null;

alter table public.profiles
  add constraint profiles_display_name_check check (char_length(trim(display_name)) between 1 and 40),
  add constraint profiles_default_account_check check (default_account in ('未指定','微信','支付宝','银行卡','现金','其他')),
  add constraint profiles_currency_check check (currency in ('CNY'));

alter table public.profiles enable row level security;
alter table public.profiles force row level security;
revoke all on public.profiles from anon;
grant select, insert, update, delete on public.profiles to authenticated;

do $$
declare p record;
begin
  for p in select policyname from pg_policies where schemaname='public' and tablename='profiles' loop
    execute format('drop policy if exists %I on public.profiles', p.policyname);
  end loop;
end $$;

create policy profiles_select on public.profiles for select to authenticated using ((select auth.uid()) = user_id);
create policy profiles_insert on public.profiles for insert to authenticated with check ((select auth.uid()) = user_id);
create policy profiles_update on public.profiles for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy profiles_delete on public.profiles for delete to authenticated using ((select auth.uid()) = user_id);

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles
for each row execute function public.touch_updated_at();

-- Private avatar bucket. Files live under avatars/{user_id}/...
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', false, 3145728, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "avatars_select_own" on storage.objects;
drop policy if exists "avatars_insert_own" on storage.objects;
drop policy if exists "avatars_update_own" on storage.objects;
drop policy if exists "avatars_delete_own" on storage.objects;

create policy "avatars_select_own" on storage.objects
for select to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "avatars_insert_own" on storage.objects
for insert to authenticated
with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "avatars_update_own" on storage.objects
for update to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "avatars_delete_own" on storage.objects
for delete to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

commit;

-- =========================================================
-- 1.0.1 verification: this final SELECT should return all true.
-- =========================================================
select
  to_regclass('public.transactions') is not null as transactions_ready,
  to_regclass('public.user_category_rules') is not null as rules_ready,
  to_regclass('public.profiles') is not null as profiles_ready,
  exists(select 1 from storage.buckets where id = 'avatars') as avatars_bucket_ready,
  exists(
    select 1 from information_schema.columns
    where table_schema='public' and table_name='transactions' and column_name='subcategory'
  ) as subcategory_ready,
  exists(
    select 1 from information_schema.columns
    where table_schema='public' and table_name='transactions' and column_name='account'
  ) as account_ready;
