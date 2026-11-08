# Supabase Auth migration

The app supports both the original `accounts` schema and the migrated schema,
so sign-up can continue while the migration is pending. Before deploying the
Auth changes, it is still strongly recommended to run
[`20261109010000_supabase_auth_accounts.sql`](./migrations/20261109010000_supabase_auth_accounts.sql)
in the Supabase project's SQL Editor. It adds a direct link between VeriPress
account rows and Supabase Auth users and permanently removes the old plaintext
password column. Back up the database before applying this destructive schema
change.

Until that migration is applied, new account rows use a random placeholder in
the legacy `password` column to satisfy the old schema; the app never reads or
authenticates with that value. Existing plaintext password values remain in the
database until the migration drops the column.

Existing VeriPress accounts are not automatically imported into Supabase Auth.
Their profiles, posts, and usernames remain in the database, but users must
select **Sign up** with their existing username and email and choose a new
password. Enable email confirmation in Supabase Auth so only the mailbox owner
can claim an existing account. They can sign in after confirming their email.

New signups and all subsequent sign-ins use Supabase Auth. Passwords are never
read from or written to the VeriPress `accounts` table.

## Article archiving and personal data tools

Before deploying, run
[`20261110010000_article_archiving.sql`](./migrations/20261110010000_article_archiving.sql)
in the Supabase SQL Editor **after** applying the Auth migration above. It adds
the `articles.archived` flag; existing articles default to published (`false`).
It also restricts archived article reads to their linked owner and grants
public reads only to published articles. The migration replaces existing
`articles` row-level security policies, so review it first if your project has
custom article policies.

Signed-in users can manage their own drafts, published articles, and archived
articles from **My Articles**. The **Backup & Reports** page exports a JSON
backup of the user's own profile, articles, drafts, archived articles, and
following list; restore validates the username and merges records without
deleting existing data. The report opens the browser's print dialog, where the
user can select **Save as PDF**.
