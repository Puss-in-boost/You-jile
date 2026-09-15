# 密码恢复修复

本版补齐 Supabase 密码恢复流程：

- 登录页新增“忘记密码？”入口。
- 使用 `resetPasswordForEmail` 发送恢复邮件。
- 监听 Supabase `PASSWORD_RECOVERY` 事件。
- 恢复链接打开后显示“设置新密码”表单，而不是普通登录表单。
- 新密码提交后调用 `updateUser({ password })`，成功后回到账本。

本地开发时请确保 Supabase Authentication 的 Redirect URLs 允许：

- `http://localhost:3000/login`
- 或 `http://localhost:3000/**`

如果旧的恢复邮件已经被使用或过期，请在新版登录页重新点“忘记密码？”发送一封新的。
