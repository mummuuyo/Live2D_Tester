# Live2D Studio

A React + Vite site that reads the model catalog from Supabase and links model files hosted on Cloudflare.

## Local development

Copy `.env.example` to `.env.local`, add your Supabase project URL and publishable key, then run:

```powershell
npm.cmd install
npm.cmd run dev
```

Open http://localhost:5173.

## Supabase setup

1. Create a Supabase project.
2. Open the SQL Editor and run [supabase/schema.sql](supabase/schema.sql).
3. In Supabase Authentication, create an administrator user with email and password.
4. Add that user to the admin list in SQL Editor (replace the email):

```sql
insert into public.live2d_admins (user_id)
select id from auth.users where email = 'your-admin@example.com'
on conflict (user_id) do nothing;
```

5. In the GitHub repository, open **Settings → Secrets and variables → Actions → Variables** and add:
   - `VITE_SUPABASE_URL`: Project URL from Supabase API settings
   - `VITE_SUPABASE_PUBLISHABLE_KEY`: publishable key from Supabase API settings
6. Push a commit to `main`. GitHub Actions rebuilds and deploys the site with the Supabase configuration.

The browser publishable key is intended for frontend use. Keep Row Level Security enabled and never put a Supabase secret or service-role key in the site. Admin writes are restricted by the `live2d_admins` table policy.

## Tracking screen

The home page opens the Live2D tracking screen directly. It loads enabled `cloudflare_url` values from Supabase and uses the official Cubism SDK renderer and pointer/touch tracking. Model names and access codes are not requested by the public page.

For an existing Supabase project, apply [the public model URL permissions migration](supabase/migrations/20261031000100_public_model_url_only.sql) in the Supabase SQL Editor before deploying this version. Anonymous visitors need read access to `cloudflare_url` and `created_at` only; authenticated admins retain their existing access. The Cloudflare model files must allow cross-origin requests from the hosted site.

The build creates the SDK page under `/tracking/`. GitHub Pages uses `/Live2D_Tester/` through the workflow setting. Netlify can use its default root path (`/`).

## Site

https://mummuuyo.github.io/Live2D_Tester/

The admin page adds models and Cloudflare URLs directly to Supabase. Other visitors see the updated catalog automatically.
