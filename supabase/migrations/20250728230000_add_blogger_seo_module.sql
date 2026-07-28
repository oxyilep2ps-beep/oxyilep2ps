-- =============================================================================
-- Blogger & Newsletter SEO Guide module
-- NEW FILE ONLY — do not edit prior migrations.
-- Tables: blog_posts, seo_metrics, competitor_analysis, keyword_research
-- =============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1. blog_posts — SEO-engine drafts (companion to public.blogs CMS)
-- ---------------------------------------------------------------------------
create table if not exists public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users (id) on delete cascade,
  title text not null default '',
  slug text not null default '',
  content text not null default '',
  meta_description text not null default '',
  focus_keyword text not null default '',
  cover_image_url text,
  cover_alt_text text,
  status text not null default 'draft'
    check (status in ('draft', 'review', 'published', 'archived')),
  content_type text not null default 'evergreen'
    check (content_type in ('evergreen', 'trending', 'news')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint blog_posts_slug_author_unique unique (author_id, slug)
);

create index if not exists blog_posts_author_idx on public.blog_posts (author_id);
create index if not exists blog_posts_status_idx on public.blog_posts (status);
create index if not exists blog_posts_focus_keyword_idx on public.blog_posts (lower(focus_keyword));
create index if not exists blog_posts_updated_at_idx on public.blog_posts (updated_at desc);

comment on table public.blog_posts is
  'SEO Content Engine drafts for bloggers — scored live before publishing to public.blogs.';

-- ---------------------------------------------------------------------------
-- 2. seo_metrics — per-post on-page scores
-- ---------------------------------------------------------------------------
create table if not exists public.seo_metrics (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null unique references public.blog_posts (id) on delete cascade,
  readability_score numeric(5,2) not null default 0,
  keyword_density numeric(6,3) not null default 0,
  focus_keyword text not null default '',
  content_score numeric(5,2) not null default 0,
  title_score numeric(5,2) not null default 0,
  meta_score numeric(5,2) not null default 0,
  heading_score numeric(5,2) not null default 0,
  link_score numeric(5,2) not null default 0,
  voice_search_score numeric(5,2) not null default 0,
  trust_score numeric(5,2) not null default 0,
  predicted_ctr numeric(5,2) not null default 0,
  read_time_minutes numeric(6,2) not null default 0,
  checklist jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists seo_metrics_content_score_idx on public.seo_metrics (content_score desc);

comment on table public.seo_metrics is
  'Real-time on-page SEO metrics snapshot for a blog_posts row.';

-- ---------------------------------------------------------------------------
-- 3. competitor_analysis — SERP gap research per post/keyword
-- ---------------------------------------------------------------------------
create table if not exists public.competitor_analysis (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references public.blog_posts (id) on delete cascade,
  author_id uuid not null references auth.users (id) on delete cascade,
  keyword text not null,
  competitor_urls jsonb not null default '[]'::jsonb,
  content_gaps jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists competitor_analysis_author_idx on public.competitor_analysis (author_id);
create index if not exists competitor_analysis_post_idx on public.competitor_analysis (post_id);
create index if not exists competitor_analysis_keyword_idx on public.competitor_analysis (lower(keyword));

comment on table public.competitor_analysis is
  'Competitor URL lists and content-gap JSON for SEO keyword research.';

-- ---------------------------------------------------------------------------
-- 4. keyword_research — shared / author keyword intel
-- ---------------------------------------------------------------------------
create table if not exists public.keyword_research (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references auth.users (id) on delete set null,
  keyword text not null,
  search_volume integer not null default 0,
  competition_level text not null default 'medium'
    check (competition_level in ('low', 'medium', 'high')),
  long_tail_suggestions jsonb not null default '[]'::jsonb,
  lsi_keywords jsonb not null default '[]'::jsonb,
  niche text not null default 'fintech',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint keyword_research_keyword_unique unique (keyword)
);

create index if not exists keyword_research_volume_idx on public.keyword_research (search_volume desc);
create index if not exists keyword_research_author_idx on public.keyword_research (author_id);

comment on table public.keyword_research is
  'Keyword research hub — volume, competition, long-tail and LSI suggestions.';

-- ---------------------------------------------------------------------------
-- 5. updated_at triggers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at_timestamp()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists blog_posts_set_updated_at on public.blog_posts;
create trigger blog_posts_set_updated_at
  before update on public.blog_posts
  for each row execute function public.set_updated_at_timestamp();

drop trigger if exists seo_metrics_set_updated_at on public.seo_metrics;
create trigger seo_metrics_set_updated_at
  before update on public.seo_metrics
  for each row execute function public.set_updated_at_timestamp();

drop trigger if exists competitor_analysis_set_updated_at on public.competitor_analysis;
create trigger competitor_analysis_set_updated_at
  before update on public.competitor_analysis
  for each row execute function public.set_updated_at_timestamp();

drop trigger if exists keyword_research_set_updated_at on public.keyword_research;
create trigger keyword_research_set_updated_at
  before update on public.keyword_research
  for each row execute function public.set_updated_at_timestamp();

-- ---------------------------------------------------------------------------
-- 6. Helper: blogger or admin
-- ---------------------------------------------------------------------------
create or replace function public.current_user_is_blogger_or_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('BLOGGER'::public.profile_role, 'ADMIN'::public.profile_role)
  )
  or exists (
    select 1
    from public.admin_allowlist a
    where lower(a.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
  or exists (
    select 1
    from public.allowed_employees e
    where lower(e.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      and e.role in ('blogger', 'admin')
  );
$$;

-- ---------------------------------------------------------------------------
-- 7. RLS
-- ---------------------------------------------------------------------------
alter table public.blog_posts enable row level security;
alter table public.seo_metrics enable row level security;
alter table public.competitor_analysis enable row level security;
alter table public.keyword_research enable row level security;

-- blog_posts: authors manage own rows; admins/bloggers can select own
drop policy if exists blog_posts_select_own on public.blog_posts;
create policy blog_posts_select_own
  on public.blog_posts for select to authenticated
  using (author_id = auth.uid() or public.current_user_is_blogger_or_admin());

drop policy if exists blog_posts_insert_own on public.blog_posts;
create policy blog_posts_insert_own
  on public.blog_posts for insert to authenticated
  with check (author_id = auth.uid() and public.current_user_is_blogger_or_admin());

drop policy if exists blog_posts_update_own on public.blog_posts;
create policy blog_posts_update_own
  on public.blog_posts for update to authenticated
  using (author_id = auth.uid() or public.current_user_is_blogger_or_admin())
  with check (author_id = auth.uid() or public.current_user_is_blogger_or_admin());

drop policy if exists blog_posts_delete_own on public.blog_posts;
create policy blog_posts_delete_own
  on public.blog_posts for delete to authenticated
  using (author_id = auth.uid() or public.current_user_is_blogger_or_admin());

-- seo_metrics: via owning post
drop policy if exists seo_metrics_select_own on public.seo_metrics;
create policy seo_metrics_select_own
  on public.seo_metrics for select to authenticated
  using (
    exists (
      select 1 from public.blog_posts p
      where p.id = seo_metrics.post_id
        and (p.author_id = auth.uid() or public.current_user_is_blogger_or_admin())
    )
  );

drop policy if exists seo_metrics_upsert_own on public.seo_metrics;
create policy seo_metrics_insert_own
  on public.seo_metrics for insert to authenticated
  with check (
    exists (
      select 1 from public.blog_posts p
      where p.id = seo_metrics.post_id and p.author_id = auth.uid()
    )
  );

drop policy if exists seo_metrics_update_own on public.seo_metrics;
create policy seo_metrics_update_own
  on public.seo_metrics for update to authenticated
  using (
    exists (
      select 1 from public.blog_posts p
      where p.id = seo_metrics.post_id and p.author_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.blog_posts p
      where p.id = seo_metrics.post_id and p.author_id = auth.uid()
    )
  );

-- competitor_analysis
drop policy if exists competitor_analysis_select_own on public.competitor_analysis;
create policy competitor_analysis_select_own
  on public.competitor_analysis for select to authenticated
  using (author_id = auth.uid() or public.current_user_is_blogger_or_admin());

drop policy if exists competitor_analysis_insert_own on public.competitor_analysis;
create policy competitor_analysis_insert_own
  on public.competitor_analysis for insert to authenticated
  with check (author_id = auth.uid() and public.current_user_is_blogger_or_admin());

drop policy if exists competitor_analysis_update_own on public.competitor_analysis;
create policy competitor_analysis_update_own
  on public.competitor_analysis for update to authenticated
  using (author_id = auth.uid())
  with check (author_id = auth.uid());

drop policy if exists competitor_analysis_delete_own on public.competitor_analysis;
create policy competitor_analysis_delete_own
  on public.competitor_analysis for delete to authenticated
  using (author_id = auth.uid());

-- keyword_research: bloggers can read all seeded/shared rows; write own
drop policy if exists keyword_research_select_blogger on public.keyword_research;
create policy keyword_research_select_blogger
  on public.keyword_research for select to authenticated
  using (public.current_user_is_blogger_or_admin());

drop policy if exists keyword_research_insert_own on public.keyword_research;
create policy keyword_research_insert_own
  on public.keyword_research for insert to authenticated
  with check (
    public.current_user_is_blogger_or_admin()
    and (author_id is null or author_id = auth.uid())
  );

drop policy if exists keyword_research_update_own on public.keyword_research;
create policy keyword_research_update_own
  on public.keyword_research for update to authenticated
  using (author_id = auth.uid() or public.current_user_is_blogger_or_admin())
  with check (author_id = auth.uid() or public.current_user_is_blogger_or_admin());

grant select, insert, update, delete on public.blog_posts to authenticated;
grant select, insert, update, delete on public.seo_metrics to authenticated;
grant select, insert, update, delete on public.competitor_analysis to authenticated;
grant select, insert, update, delete on public.keyword_research to authenticated;
grant all on public.blog_posts to service_role;
grant all on public.seo_metrics to service_role;
grant all on public.competitor_analysis to service_role;
grant all on public.keyword_research to service_role;

-- ---------------------------------------------------------------------------
-- 8. Seed FinTech keyword research (idempotent)
-- ---------------------------------------------------------------------------
insert into public.keyword_research (keyword, search_volume, competition_level, long_tail_suggestions, lsi_keywords, niche)
values
  (
    'peer to peer lending uk',
    5400,
    'medium',
    '["best p2p lending platforms uk 2026","p2p lending tax uk","is peer to peer lending safe uk"]'::jsonb,
    '["direct lending","marketplace lending","alternative finance","crowd lending"]'::jsonb,
    'fintech'
  ),
  (
    'gocardless direct debit',
    2900,
    'low',
    '["gocardless vs stripe","set up direct debit for saas","bacs mandate explained"]'::jsonb,
    '["recurring payments","bacs","open banking","emi collection"]'::jsonb,
    'fintech'
  ),
  (
    'uk borrower kyc requirements',
    1600,
    'low',
    '["fca kyc checklist","proof of address uk lending","liveness check for loans"]'::jsonb,
    '["aml","identity verification","compliance onboarding"]'::jsonb,
    'fintech'
  ),
  (
    'escrow lending explained',
    880,
    'medium',
    '["how escrow protects investors","client money account uk","segregated funds lending"]'::jsonb,
    '["safeguarding","payment agent","settlement"]'::jsonb,
    'fintech'
  ),
  (
    'fixed rate p2p returns',
    1200,
    'high',
    '["average p2p returns uk","risk vs return lending","emi calculator peer lending"]'::jsonb,
    '["yield","apr","default risk","portfolio diversification"]'::jsonb,
    'fintech'
  )
on conflict (keyword) do update set
  search_volume = excluded.search_volume,
  competition_level = excluded.competition_level,
  long_tail_suggestions = excluded.long_tail_suggestions,
  lsi_keywords = excluded.lsi_keywords,
  updated_at = now();

commit;
