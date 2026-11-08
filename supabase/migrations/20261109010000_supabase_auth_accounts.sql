begin;

alter table public.accounts
  add column if not exists auth_user_id uuid
  references auth.users (id)
  on delete set null;

create unique index if not exists accounts_auth_user_id_key
  on public.accounts (auth_user_id)
  where auth_user_id is not null;

alter table public.accounts
  drop column if exists password;

comment on column public.accounts.auth_user_id is
  'Supabase Auth user linked to this VeriPress account.';

commit;
