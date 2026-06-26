# Supabase Setup

This project uses GitHub Pages for the frontend and Supabase for shared template data.

## 1. Run the database setup

Open Supabase Dashboard > SQL Editor, then paste and run:

`supabase/schema.sql`

This creates:

- `templates` table for template JSON
- `admin_profiles` table for admin allow-list
- `template-assets` Storage bucket for overlay images
- `template-downloads` Storage bucket for downloadable source files
- Row Level Security policies

## 2. Create your admin login

Go to Supabase Dashboard > Authentication > Users.

Create your own user with email and password.

Copy that user's `User UID`, then run this in SQL Editor:

```sql
insert into public.admin_profiles (user_id)
values ('PASTE-YOUR-USER-UID-HERE')
on conflict (user_id) do nothing;
```

Only users listed in `admin_profiles` can create, update, delete, or upload template files.

## 3. Deploy to GitHub Pages

The Supabase URL and public anon key are already configured in:

`src/config/supabase.ts`

For a more private build setup, you can also set these as GitHub Actions variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

The anon key is safe to be visible in the browser. Security is enforced by Supabase Auth and RLS policies.

## 4. Use the site

- Client page: `index.html` or `client.html`
- Admin page: `atelier-vault-7291.html`

Log in to the admin page with the Supabase Auth email/password you created.
