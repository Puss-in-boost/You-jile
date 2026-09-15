# Password recovery fix v2

This update fixes recovery links that return to `/` before the login page.

Changes:
- Root page detects Supabase recovery links and renders the auth flow before ledger auth redirection can strip URL tokens.
- Login supports both Supabase implicit/hash recovery tokens and PKCE `?code=` recovery links.
- One-time recovery tokens are removed from the address bar after a session is established.
- Rate-limit errors are translated to a user-friendly Chinese message.
