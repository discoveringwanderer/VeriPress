# Deploy VeriPress to Vercel

## Import the GitHub repository

1. Sign in to [Vercel](https://vercel.com/) and choose **Add New → Project**.
2. Import `discoveringwanderer/VeriPress`.
3. Keep the project root at the repository root (the folder containing
   `package.json`).
4. Use these build settings:
   - Framework preset: **Vite**
   - Install command: `pnpm install`
   - Build command: `pnpm build`
   - Output directory: `dist`
5. Add these environment variables for **Production**, **Preview**, and
   **Development**. Copy their values directly from the local `.env` file into
   Vercel's Environment Variables form; do not commit `.env` or paste its
   contents into source code.
   - `VITE_SUPABASE_URL`: the Supabase project's base URL, such as
     `https://your-project.supabase.co` (do not append `/rest/v1`)
   - `VITE_SUPABASE_ANON_KEY`: the project's publishable/anon key
6. Click **Deploy**.

The Vercel configuration serves the Vite build from `dist` and falls back to
`index.html` for client-side routes.

## Configure Supabase Auth

After Vercel gives you a deployment URL:

1. In Supabase, open **Authentication → URL Configuration**.
2. Set **Site URL** to the production Vercel URL.
3. Add the production URL and Vercel preview URLs to **Redirect URLs**, for
   example `https://your-project.vercel.app/**` and
   `https://*-your-team.vercel.app/**`.
4. Ensure email confirmation is enabled if users should verify their email.

The `accounts.auth_user_id` migration must be applied before production
sign-ups. See [the Supabase migration instructions](./supabase/README.md).

## Redeploy after configuration

Commit and push the deployment configuration to the connected GitHub branch.
Vercel will build and deploy each push automatically. Environment-variable or
Supabase Auth URL changes require a new deployment before the client bundle
uses the updated values.
