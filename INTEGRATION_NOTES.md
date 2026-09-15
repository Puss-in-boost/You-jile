# 又寄了 2.0 整合说明

本版本以 Astra 生成的新版工程为底座，恢复旧版“又寄了”的轻量、移动优先界面。

## 保留的新版本能力

- Next.js 16 / React 19
- PostgreSQL + Drizzle
- 本地账号 / Supabase Auth
- `/api/transactions`、`/api/auth`、`/api/rules`
- 用户数据隔离与云同步结构
- 一句话解析、用户规则、精确/alias/模糊分类
- 编辑、删除、10 秒撤销
- CSV 导出
- PWA / Service Worker

## 恢复的旧版产品界面

- 无桌面 Sidebar / breadcrumb
- 顶部“又寄了”+日期
- 本月支出大数字
- “今天又寄了多少？”快速记账
- 语音/拍照占位入口
- “今天发现”
- “最近”账单
- 底部：`首页 / 账单 / +记账 / 洞察 / 我的`
- PC 只适度加宽内容，不切换企业后台布局

## 同时修复

`src/lib/transactions.ts` 不再无条件执行 `response.json()`。
空响应、非 JSON、HTTP 500 会显示可理解的错误，避免：

`Unexpected end of JSON input`

## 本地运行

1. `npm install`
2. 根据 `.env.example` 配置 `.env.local`，尤其是 `DATABASE_URL`
3. `npm run dev`

如果数据库尚未配置，界面仍会正常显示，但顶部会明确提示服务端/数据库不可用；保存账单需要可用数据库。
