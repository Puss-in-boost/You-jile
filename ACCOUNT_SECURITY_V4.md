# V4 account security update

- Adds **修改密码** under **我的 → 账本与应用** for authenticated Supabase users.
- Uses the existing authenticated Supabase session and `auth.updateUser({ password })`.
- The user does not need to know or enter the old password while the current session is valid.
- Requires a minimum of 8 characters and confirmation matching.
- Demo accounts do not show the password control.
- After saving, the current session remains signed in; the new password applies to the next login.
