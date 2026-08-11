-- Social campaigns media format + analytics tables.
-- Forward-only migration.

begin;

alter table public.social_campaigns
  add column if not exists media_type varchar not null default 'image'
    check (media_type in ('image', 'video', 'story')),
  add column if not exists metrics jsonb not null default '{}'::jsonb;

comment on column public.social_campaigns.media_type is
  'Social media format: image post, video reel, or story.';
comment on column public.social_campaigns.metrics is
  'Aggregated social performance metrics from Make.com polling.';

create table if not exists public.platform_analytics (
  id uuid primary key default gen_random_uuid(),
  date date not null unique,
  total_visitors int not null default 0,
  total_blog_reads int not null default 0,
  avg_read_time_seconds int not null default 0,
  active_campaigns int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists platform_analytics_date_desc_idx
  on public.platform_analytics (date desc);

create or replace function public.set_platform_analytics_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists platform_analytics_set_updated_at on public.platform_analytics;
create trigger platform_analytics_set_updated_at
  before update on public.platform_analytics
  for each row execute function public.set_platform_analytics_updated_at();

alter table public.platform_analytics enable row level security;

drop policy if exists platform_analytics_admin_or_social_read on public.platform_analytics;
create policy platform_analytics_admin_or_social_read
  on public.platform_analytics
  for select to authenticated
  using (public.current_user_is_admin_or_social_manager());

drop policy if exists platform_analytics_admin_or_social_insert on public.platform_analytics;
create policy platform_analytics_admin_or_social_insert
  on public.platform_analytics
  for insert to authenticated
  with check (public.current_user_is_admin_or_social_manager());

drop policy if exists platform_analytics_admin_or_social_update on public.platform_analytics;
create policy platform_analytics_admin_or_social_update
  on public.platform_analytics
  for update to authenticated
  using (public.current_user_is_admin_or_social_manager())
  with check (public.current_user_is_admin_or_social_manager());

drop policy if exists platform_analytics_admin_or_social_delete on public.platform_analytics;
create policy platform_analytics_admin_or_social_delete
  on public.platform_analytics
  for delete to authenticated
  using (public.current_user_is_admin_or_social_manager());

grant select, insert, update, delete on public.platform_analytics to authenticated;
grant all on public.platform_analytics to service_role;

commit;
