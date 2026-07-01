# StoryForge deployment

Проект уже подготовлен для Vercel:

- `vercel.json` отправляет все страницы в `index.html`, поэтому вход через Google и обновление страницы работают в SPA.
- В Vercel нужно добавить Environment Variables:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
- В Supabase Dashboard нужно добавить production URL в:
  - Authentication -> URL Configuration -> Site URL
  - Authentication -> URL Configuration -> Redirect URLs
- Для локальной разработки используется:
  - `http://localhost:5173`

После деплоя Google-вход должен иметь redirect URL:

```text
https://<your-vercel-domain>/auth/v1/callback
```

В Google Cloud OAuth также проверь authorized redirect URI от Supabase:

```text
https://jdpslfjhzxbgxztpzmag.supabase.co/auth/v1/callback
```
