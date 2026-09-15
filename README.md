# 又寄了 1.0

这是当前建议作为日常使用基线的版本。已有 Supabase 项目请运行 `supabase/upgrade_to_1_0.sql`，然后继续使用原来的 `.env.local`。

新增：个人资料（昵称、头像、默认支付方式）与手动记账可靠性修复。详见 `RELEASE_1_0_NOTES.md`。

# 又寄了 · Release Candidate

钱有去处，生活有数。当前版本以 **Supabase Auth + Supabase PostgreSQL + RLS + Realtime** 作为正式云端数据链路，前端保持旧版「又寄了」的轻量、移动优先界面。

## 现在已经可以长期使用的功能

- 邮箱注册、登录、会话保持、退出、忘记密码、登录后直接修改密码。
- 一句话记账：金额、今天/昨天/前天/上周/上个月、收入/支出、分类、细分类、支付方式识别。
- 手动新增、编辑、删除、10 秒撤销。
- 支付方式默认 **未指定**；只有明确写了微信/支付宝/现金/银行卡才自动记录。
- 一级分类 + 细分类：例如 `瑞幸 → 餐饮 / 咖啡饮品`，首页按一级分类统计，洞察页继续拆细分类。
- 个人分类学习规则：你手动改过的商家，下次优先按你的习惯分类。
- 账单月筛选、搜索、收入/支出筛选、分类筛选、支付账户筛选。
- 首页实时支出/收入/结余、最近账单、消费发现。
- 洞察：分类占比、细分类、月度环比、每日支出趋势。
- CSV 全量导出。
- Supabase RLS 用户隔离、Realtime 同步、多设备同账号同步。
- PWA 安装、离线提示；不会缓存私人账单，也不会在离线时假装保存成功。

## 尚未上线（界面会明确标记，不是假按钮）

- 语音识别记账
- 拍照 / OCR 记账
- 离线写入队列
- 预算、多币种、共享账本

这些属于后续新增功能，不影响当前版本作为日常个人账本使用。

---

## 你现有 Supabase 项目：一次性升级

你已经有旧版 `transactions` 和 Supabase Auth 用户，不要删库、不需要重建项目。

在 Supabase → SQL Editor 里完整执行：

```text
supabase/upgrade_existing_to_release.sql
```

这一个脚本会一次性完成：

- 保留旧账单与 user_id
- 补齐 account / updated_at / subcategory
- `咖啡饮品 → 餐饮 / 咖啡饮品`
- 旧文字记账程序默认的 `微信 → 未指定`
- 创建/升级个人分类规则表
- 重建当前 RLS policy
- Realtime
- updated_at trigger
- 当前约束与索引

脚本可重复执行，不会删除正常账单。

如果是全新的 Supabase 项目，直接执行：

```text
supabase/schema.sql
```

---

## 本地运行：以后固定这套流程

需要 Node.js 22 LTS（Node 24 也可运行当前版本）。

1. 解压项目。
2. 在 `package.json` 同级创建 `.env.local`：

```env
NEXT_PUBLIC_SUPABASE_URL=https://你的项目.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=你的完整_publishable_key
DISABLE_DEMO=true
```

云端账本模式 **不需要 `DATABASE_URL`**。

3. 第一次安装：

```powershell
npm install
```

4. 可选自检：

```powershell
npm run doctor
```

5. 启动：

```powershell
npm run dev
```

6. 打开：

```text
http://localhost:3000
```

以后日常启动只需要 `npm run dev`。

---

## Supabase Auth 配置

Authentication → URL Configuration 建议允许：

```text
http://localhost:3000/login
http://localhost:3000/**
```

正式部署后再加入正式域名。

Supabase 默认邮件服务有发送频率限制；正式长期使用建议配置自定义 SMTP。应用已经把常见 Supabase 英文错误转换为中文提示。

---

## 数据模型

账单：

```text
id
user_id
type
amount
category
subcategory
emoji
title
transaction_date
source
account
created_at
updated_at
```

当前一级分类：

```text
餐饮 / 交通 / 娱乐 / 购物 / 居住 / 生活缴费 / 订阅服务 / 医疗 / 学习 / 旅行 / 收入 / 其他
```

餐饮细分类：

```text
正餐 / 咖啡饮品 / 奶茶茶饮 / 零食烘焙 / 生鲜买菜 / 酒水
```

支付方式：

```text
未指定 / 微信 / 支付宝 / 银行卡 / 现金 / 其他
```

---

## 验证命令

安装依赖后：

```powershell
npm run doctor
npm run typecheck
npm run lint
npm run test
npm run build
```

也可以一次：

```powershell
npm run check
```

`tests/browser-smoke.ts` 是浏览器级回归脚本，主要覆盖新增/编辑/删除/撤销/筛选/多账号隔离与移动端溢出。

---

## 部署

代码可部署到 Vercel/其他 Next.js Node 平台。Supabase 直连模式只需要在部署平台配置：

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
DISABLE_DEMO=true
```

不要提交 `.env.local`、密码、secret/service_role key。

## 1.1 补旧账模式

「账单」页新增「补旧账」入口。可锁定某一天连续输入账单、前后切换日期，并支持多行批量解析/保存。该功能不需要数据库迁移。
