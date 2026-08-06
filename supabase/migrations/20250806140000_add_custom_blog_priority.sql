-- Custom blog priority for Admin reordering of published articles.
-- Forward-only. Does not modify prior migration files.

begin;

alter table public.blogs
  add column if not exists priority integer not null default 0;

alter table public.blog_posts
  add column if not exists priority integer not null default 0;

comment on column public.blogs.priority is
  'Admin custom display order. Higher values surface first when priority > 0.';
comment on column public.blog_posts.priority is
  'Admin custom display order for SEO Studio posts.';

create index if not exists blogs_priority_published_idx
  on public.blogs (priority desc, published_at desc nulls last);

create index if not exists blog_posts_priority_published_idx
  on public.blog_posts (priority desc, published_at desc nulls last);

create or replace function public.update_blog_priority(blog_id uuid, new_priority integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.blogs
  set priority = coalesce(new_priority, 0),
      updated_at = now()
  where id = blog_id;
end;
$$;

revoke all on function public.update_blog_priority(uuid, integer) from public;
grant execute on function public.update_blog_priority(uuid, integer) to service_role;

commit;
