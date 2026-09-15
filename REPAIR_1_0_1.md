# 又寄了 1.0.1 一键修复

本版针对两个已确认问题：

1. `public.profiles` / `avatars` bucket 未初始化，导致个人资料与头像不可用。
2. 手动记账失败时，弹窗以前只显示通用错误，无法看到数据库真实原因。

## 必做一次

在 Supabase Dashboard → SQL Editor 中，完整执行：

`supabase/repair_1_0_1.sql`

脚本可重复执行，不删除现有账单。

执行结束时会返回 6 个布尔字段；都应为 `true`：

- transactions_ready
- rules_ready
- profiles_ready
- avatars_bucket_ready
- subcategory_ready
- account_ready

然后重启本地开发服务：

```powershell
Ctrl + C
npm run dev
```

## 本版前端改动

- 手动记账失败时，错误原因直接显示在记账弹窗中。
- 快速记账失败时，错误原因直接显示在快速记账区域。
- `profiles` / Storage 未初始化时，不再显示 Supabase 原始英文错误，而是明确提示执行修复 SQL。
