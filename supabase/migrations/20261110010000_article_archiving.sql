begin;

alter table public.articles
  add column if not exists archived boolean not null default false;

update public.articles as article
set owner_username = profile.username
from (
  select lower(name) as author_name, min(username) as username
  from public.profiles
  where coalesce(name, '') <> ''
  group by lower(name)
  having count(*) = 1
) as profile
where coalesce(nullif(btrim(article.owner_username), ''), '') = ''
  and lower(article.author) = profile.author_name;

create or replace function public.veripress_sync_article_owner_on_account_rename()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.username is distinct from old.username then
    update public.articles
    set owner_username = new.username
    where lower(owner_username) = lower(old.username);
  end if;
  return new;
end;
$$;

drop trigger if exists accounts_sync_article_owner_username on public.accounts;
create trigger accounts_sync_article_owner_username
  after update of username on public.accounts
  for each row
  execute function public.veripress_sync_article_owner_on_account_rename();

create or replace function public.veripress_owns_article(article_owner_username text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.accounts
    where lower(username) = lower(article_owner_username)
      and auth_user_id = (select auth.uid())
  );
$$;

revoke all on function public.veripress_owns_article(text) from public;
grant execute on function public.veripress_owns_article(text) to anon, authenticated;

do $$
declare
  existing_policy record;
begin
  for existing_policy in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'articles'
  loop
    execute format('drop policy %I on public.articles', existing_policy.policyname);
  end loop;
end;
$$;

alter table public.articles enable row level security;

create policy "Public can read published articles"
  on public.articles for select
  to anon, authenticated
  using (archived = false);

create policy "Owners can read their articles"
  on public.articles for select
  to authenticated
  using (public.veripress_owns_article(owner_username));

create policy "Owners can insert their articles"
  on public.articles for insert
  to authenticated
  with check (public.veripress_owns_article(owner_username));

create policy "Owners can update their articles"
  on public.articles for update
  to authenticated
  using (public.veripress_owns_article(owner_username))
  with check (public.veripress_owns_article(owner_username));

create policy "Owners can delete their articles"
  on public.articles for delete
  to authenticated
  using (public.veripress_owns_article(owner_username));

comment on column public.articles.archived is
  'Whether an article is hidden from VeriPress public feeds and retained in its owner''s archive.';

commit;
