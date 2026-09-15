# 又寄了 2.0 — Supabase Direct Data V3

本版把 Supabase 模式下的数据 CRUD 改为浏览器端通过 `@supabase/supabase-js` 直接访问 Supabase：

- Auth：Supabase Auth
- 账单 CRUD：Supabase PostgREST + RLS
- 分类偏好：Supabase PostgREST + RLS
- Realtime：保留原有订阅
- 本地/无 Supabase 模式：仍保留原有 Next API + PostgreSQL fallback

## 目的

避免本地开发必须建立 `DATABASE_URL` 的 Direct PostgreSQL TCP 连接。只要：

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
```

即可使用云端账本。

`DATABASE_URL` 现在仅供无 Supabase/传统服务端 API fallback 使用；Supabase 模式下前端不会依赖它来读取或保存账单。
