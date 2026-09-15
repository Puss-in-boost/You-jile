-- 又寄了 1.2.1：数字名称 / 平台会员修复
-- 可重复执行；不会删除账单。

begin;

-- 将明确的平台会员标题纠正为“订阅服务 / 平台会员”。
update public.transactions
set category = '订阅服务',
    subcategory = '平台会员',
    emoji = '🛒',
    updated_at = now()
where type = 'expense'
  and lower(regexp_replace(title, '\\s+', '', 'g')) ~
      '(淘宝会员|淘宝88会员|淘宝88vip|88会员|88vip|天猫会员|京东plus|京东plus会员|京东会员|美团会员|饿了么会员|超级吃货卡)';

-- 如果之前已经手工建立过这些关键词的个人规则，也同步到新细分类。
update public.user_category_rules
set category = '订阅服务',
    subcategory = '平台会员',
    updated_at = now()
where lower(normalized_keyword) ~
      '(淘宝会员|淘宝88会员|淘宝88vip|88会员|88vip|天猫会员|京东plus|京东plus会员|京东会员|美团会员|饿了么会员|超级吃货卡)';

commit;
