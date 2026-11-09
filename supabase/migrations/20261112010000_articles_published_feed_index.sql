begin;

create index if not exists articles_published_created_at_idx
  on public.articles (created_at desc)
  where archived = false;

commit;
