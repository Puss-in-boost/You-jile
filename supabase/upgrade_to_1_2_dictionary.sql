-- 又寄了 1.2：丰富分类词库 + 新增“生活缴费 / 订阅服务”
-- 可在 1.0.1 / 1.1 数据库上直接执行；不会删除账单。

begin;

-- 1) 放宽一级分类约束，加入两个新的正式一级分类。
alter table public.transactions
  drop constraint if exists transactions_category_check;

alter table public.user_category_rules
  drop constraint if exists user_category_rules_category_check;

alter table public.transactions
  add constraint transactions_category_check
  check (category in ('餐饮','交通','娱乐','购物','居住','生活缴费','订阅服务','医疗','学习','旅行','收入','其他'));

alter table public.user_category_rules
  add constraint user_category_rules_category_check
  check (category in ('餐饮','交通','娱乐','购物','居住','生活缴费','订阅服务','医疗','学习','旅行','收入','其他'));

-- 2) 对已有账单做保守迁移。仅按很明确的标题关键词处理；用户自定义规则不改。
-- 生活缴费：水电燃气
update public.transactions
set category = '生活缴费', subcategory = '水电燃气', emoji = '💡'
where type = 'expense'
  and title ~* '(水费|电费|水电费|燃气费|天然气|煤气费|国家电网)';

-- 生活缴费：话费流量
update public.transactions
set category = '生活缴费', subcategory = '话费流量', emoji = '📱'
where type = 'expense'
  and title ~* '(话费|流量包|中国移动|中国联通|中国电信|移动话费|联通话费|电信话费)';

-- 生活缴费：宽带网络
update public.transactions
set category = '生活缴费', subcategory = '宽带网络', emoji = '📶'
where type = 'expense'
  and title ~* '(宽带|宽带费|网费|网络费|家庭宽带|光纤|有线电视)';

-- 订阅服务：AI 工具
update public.transactions
set category = '订阅服务', subcategory = 'AI工具', emoji = '🤖'
where type = 'expense'
  and lower(title) ~ '(chatgpt|openai|gpt充值|gpt plus|claude|gemini|perplexity|cursor|copilot|midjourney|deepseek|kimi会员)';

-- 订阅服务：视频会员
update public.transactions
set category = '订阅服务', subcategory = '视频会员', emoji = '📺'
where type = 'expense'
  and lower(title) ~ '(腾讯视频|爱奇艺|优酷|芒果tv|b站大会员|哔哩哔哩大会员|netflix|disney|youtube premium)';

-- 订阅服务：音乐会员
update public.transactions
set category = '订阅服务', subcategory = '音乐会员', emoji = '🎵'
where type = 'expense'
  and lower(title) ~ '(网易云|qq音乐|spotify|apple music|汽水音乐)';

-- 订阅服务：云存储
update public.transactions
set category = '订阅服务', subcategory = '云存储', emoji = '☁️'
where type = 'expense'
  and lower(title) ~ '(icloud|google one|onedrive|dropbox|百度网盘|阿里云盘|天翼云盘)';

-- 订阅服务：软件会员
update public.transactions
set category = '订阅服务', subcategory = '软件会员', emoji = '🧩'
where type = 'expense'
  and lower(title) ~ '(wps|microsoft 365|office 365|adobe|notion|canva|迅雷会员|夸克会员|扫描全能王)';

-- 明确的游戏内容。
update public.transactions
set category = '娱乐', subcategory = '游戏', emoji = '🎮'
where type = 'expense'
  and lower(title) ~ '(游戏皮肤|皮肤|点券|steam|王者荣耀|原神|崩坏|星穹铁道|绝区零|英雄联盟|lol|psn|playstation|xbox|nintendo|switch游戏|战网|米哈游)'
  and title !~ '(皮肤科|皮肤病)';

-- 买菜 / 电商的明确商家。
update public.transactions
set category = '餐饮', subcategory = '生鲜买菜', emoji = '🥬'
where type = 'expense'
  and lower(title) ~ '(多多买菜|盒马|叮咚买菜|朴朴|小象超市|钱大妈|美团买菜)';

update public.transactions
set category = '购物', subcategory = '电商购物', emoji = '📦'
where type = 'expense'
  and lower(title) ~ '(拼多多|淘宝|天猫|京东|唯品会|抖音商城|小红书商城|得物|闲鱼|temu)'
  and lower(title) !~ '(多多买菜)';

commit;
