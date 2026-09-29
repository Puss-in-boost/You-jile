-- 又寄了 1.3：分类体系瘦身 + 生活缴费并入居住
-- 可在 1.2.1 数据库上重复执行；不会删除账单，只迁移分类标签。
begin;

alter table public.transactions
  drop constraint if exists transactions_category_check;
alter table public.user_category_rules
  drop constraint if exists user_category_rules_category_check;

-- 餐饮
update public.transactions set subcategory='饮料', emoji='🥤', updated_at=now()
where category='餐饮' and subcategory in ('咖啡饮品','奶茶茶饮');
update public.transactions set subcategory='零食甜品', emoji='🥐', updated_at=now()
where category='餐饮' and subcategory='零食烘焙';

-- 交通
update public.transactions set subcategory='公共交通', emoji='🚇', updated_at=now()
where category='交通' and subcategory='公交地铁';
update public.transactions set subcategory='长途交通', emoji='🚄', updated_at=now()
where category='交通' and subcategory in ('火车高铁','飞机');
update public.transactions set subcategory='用车', emoji='🚗', updated_at=now()
where category='交通' and subcategory='驾车用车';

-- 娱乐
update public.transactions set subcategory='影视演出', emoji='🎬', updated_at=now()
where category='娱乐' and subcategory='电影演出';
update public.transactions set subcategory='直播互动', emoji='🎁', updated_at=now()
where category='娱乐' and subcategory='直播打赏';

-- 购物：先合并，再对旧“电商购物”按标题做保守重判。
update public.transactions set subcategory='日用家居', emoji='🧻', updated_at=now()
where category='购物' and subcategory in ('日用百货','家居用品');
update public.transactions set subcategory='其他购物', emoji='📦', updated_at=now()
where category='购物' and subcategory='电商购物';

update public.transactions set subcategory='服饰鞋包', emoji='👕', updated_at=now()
where category='购物' and subcategory='其他购物'
  and lower(title) ~ '(衣服|裤子|外套|鞋子|鞋|袜子|内衣|包包|服装|优衣库|uniqlo|zara|nike|adidas)';
update public.transactions set subcategory='数码家电', emoji='💻', updated_at=now()
where category='购物' and subcategory='其他购物'
  and lower(title) ~ '(手机|电脑|平板|耳机|键盘|鼠标|显示器|充电器|数据线|家电|apple|小米|华为)';
update public.transactions set subcategory='日用家居', emoji='🧻', updated_at=now()
where category='购物' and subcategory='其他购物'
  and lower(title) ~ '(纸巾|洗衣液|洗发水|沐浴露|牙膏|牙刷|清洁|家具|家居|床品|被子|枕头|收纳|宜家|ikea)';
update public.transactions set subcategory='美妆个护', emoji='🧴', updated_at=now()
where category='购物' and subcategory='其他购物'
  and lower(title) ~ '(护肤|化妆|洗面奶|面膜|防晒|精华|面霜|香水|口红|理发|美发)';

-- 生活缴费整个一级分类并入居住。
update public.transactions
set category='居住',
    subcategory=case
      when subcategory in ('话费流量','宽带网络') then '通信网络'
      else subcategory
    end,
    emoji=case
      when subcategory='水电燃气' then '💡'
      when subcategory in ('话费流量','宽带网络') then '📶'
      when subcategory='保险保障' then '🛡️'
      when subcategory='政务服务' then '🏛️'
      else '🏠'
    end,
    updated_at=now()
where category='生活缴费';

-- 订阅
update public.transactions set subcategory='数字工具', emoji='🧩', updated_at=now()
where category='订阅服务' and subcategory in ('AI工具','软件会员');
update public.transactions set subcategory='影音会员', emoji='📺', updated_at=now()
where category='订阅服务' and subcategory in ('视频会员','音乐会员');

-- 医疗 / 学习 / 旅行 / 收入 / 其他
update public.transactions set subcategory='就医检查', emoji='🏥', updated_at=now()
where category='医疗' and subcategory in ('门诊检查','牙科','眼科');
update public.transactions set subcategory='课程学费', emoji='🎓', updated_at=now()
where category='学习' and subcategory in ('课程培训','学费');
update public.transactions set subcategory='景点活动', emoji='🎫', updated_at=now()
where category='旅行' and subcategory='景点门票';
update public.transactions set subcategory='转入所得', emoji='🧧', updated_at=now()
where category='收入' and subcategory='红包转入';
update public.transactions set subcategory='手续费用', emoji='🏦', updated_at=now()
where category='其他' and subcategory='手续费';

-- 用户自定义规则也同步到新分类名称，防止规则继续写回旧标签。
update public.user_category_rules
set category='居住',
    subcategory=case
      when subcategory in ('话费流量','宽带网络') then '通信网络'
      else subcategory
    end,
    updated_at=now()
where category='生活缴费';

update public.user_category_rules set subcategory='饮料', updated_at=now()
where category='餐饮' and subcategory in ('咖啡饮品','奶茶茶饮');
update public.user_category_rules set subcategory='零食甜品', updated_at=now()
where category='餐饮' and subcategory='零食烘焙';
update public.user_category_rules set subcategory='公共交通', updated_at=now()
where category='交通' and subcategory='公交地铁';
update public.user_category_rules set subcategory='长途交通', updated_at=now()
where category='交通' and subcategory in ('火车高铁','飞机');
update public.user_category_rules set subcategory='用车', updated_at=now()
where category='交通' and subcategory='驾车用车';
update public.user_category_rules set subcategory='影视演出', updated_at=now()
where category='娱乐' and subcategory='电影演出';
update public.user_category_rules set subcategory='直播互动', updated_at=now()
where category='娱乐' and subcategory='直播打赏';
update public.user_category_rules set subcategory='日用家居', updated_at=now()
where category='购物' and subcategory in ('日用百货','家居用品');
update public.user_category_rules set subcategory='其他购物', updated_at=now()
where category='购物' and subcategory='电商购物';
update public.user_category_rules set subcategory='数字工具', updated_at=now()
where category='订阅服务' and subcategory in ('AI工具','软件会员');
update public.user_category_rules set subcategory='影音会员', updated_at=now()
where category='订阅服务' and subcategory in ('视频会员','音乐会员');
update public.user_category_rules set subcategory='就医检查', updated_at=now()
where category='医疗' and subcategory in ('门诊检查','牙科','眼科');
update public.user_category_rules set subcategory='课程学费', updated_at=now()
where category='学习' and subcategory in ('课程培训','学费');
update public.user_category_rules set subcategory='景点活动', updated_at=now()
where category='旅行' and subcategory='景点门票';
update public.user_category_rules set subcategory='转入所得', updated_at=now()
where category='收入' and subcategory='红包转入';
update public.user_category_rules set subcategory='手续费用', updated_at=now()
where category='其他' and subcategory='手续费';

-- 1.3 正式一级分类：删除“生活缴费”，其内容已全部并入“居住”。
alter table public.transactions
  add constraint transactions_category_check
  check (category in ('餐饮','交通','娱乐','购物','居住','订阅服务','医疗','学习','旅行','收入','其他'));

alter table public.user_category_rules
  add constraint user_category_rules_category_check
  check (category in ('餐饮','交通','娱乐','购物','居住','订阅服务','医疗','学习','旅行','收入','其他'));

commit;
