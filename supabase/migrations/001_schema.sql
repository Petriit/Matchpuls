-- ═══════════════════════════════════════════════════════════════════════════
-- MATCHPULS – Komplett databasschema
-- Kör detta i: Supabase Dashboard → SQL Editor → klistra in → Run
-- ═══════════════════════════════════════════════════════════════════════════

create extension if not exists "uuid-ossp";

-- ─── PROFILES ────────────────────────────────────────────────────────────────
create table if not exists profiles (
  id             uuid primary key references auth.users(id) on delete cascade,
  username       text unique not null,
  default_alias  text,
  avatar_url     text,
  bio            text,
  joined_at      timestamptz default now(),
  post_count     int default 0,
  like_count     int default 0,
  is_online      bool default false,
  last_seen_at   timestamptz default now(),
  role           text default 'user'  -- 'user' | 'moderator' | 'admin'
);
alter table profiles enable row level security;
create policy "Profiles readable"     on profiles for select using (true);
create policy "Own profile editable"  on profiles for update using (auth.uid() = id);

-- Auto-skapa profil vid registrering
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, username, default_alias, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email,'@',1)),
    new.raw_user_meta_data->>'default_alias',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ─── LEAGUES ─────────────────────────────────────────────────────────────────
create table if not exists leagues (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  country     text not null,
  flag_emoji  text not null,
  slug        text unique not null,
  sport       text not null default 'football',
  created_at  timestamptz default now()
);
alter table leagues enable row level security;
create policy "Leagues readable" on leagues for select using (true);

-- Seed-data
insert into leagues (name, country, flag_emoji, slug, sport) values
  ('Premier League',  'England',   '🇬🇧', 'premier-league',  'football'),
  ('La Liga',         'Spanien',   '🇪🇸', 'la-liga',         'football'),
  ('Bundesliga',      'Tyskland',  '🇩🇪', 'bundesliga',       'football'),
  ('Serie A',         'Italien',   '🇮🇹', 'serie-a',          'football'),
  ('Ligue 1',         'Frankrike', '🇫🇷', 'ligue-1',          'football'),
  ('Allsvenskan',     'Sverige',   '🇸🇪', 'allsvenskan',      'football'),
  ('Champions League','Europa',    '🌟', 'champions-league', 'football')
on conflict (slug) do nothing;

-- ─── TEAMS ───────────────────────────────────────────────────────────────────
create table if not exists teams (
  id          uuid primary key default uuid_generate_v4(),
  league_id   uuid not null references leagues(id) on delete cascade,
  name        text not null,
  short_name  text not null,
  color       text not null default '#e8304a',
  slug        text unique not null,
  created_at  timestamptz default now()
);
alter table teams enable row level security;
create policy "Teams readable" on teams for select using (true);

-- ─── FORUMS ──────────────────────────────────────────────────────────────────
create table if not exists forums (
  id           uuid primary key default uuid_generate_v4(),
  team_id      uuid unique not null references teams(id) on delete cascade,
  post_count   int default 0,
  member_count int default 0,
  today_count  int default 0,
  created_at   timestamptz default now()
);
alter table forums enable row level security;
create policy "Forums readable" on forums for select using (true);

-- ─── FORUM MODERATORS ────────────────────────────────────────────────────────
create table if not exists forum_moderators (
  id        uuid primary key default uuid_generate_v4(),
  forum_id  uuid not null references forums(id) on delete cascade,
  user_id   uuid not null references profiles(id) on delete cascade,
  role      text not null default 'moderator',
  unique(forum_id, user_id)
);
alter table forum_moderators enable row level security;
create policy "Mods readable" on forum_moderators for select using (true);

-- ─── SUBSCRIPTIONS ───────────────────────────────────────────────────────────
create table if not exists subscriptions (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references profiles(id) on delete cascade,
  forum_id   uuid not null references forums(id)   on delete cascade,
  created_at timestamptz default now(),
  unique(user_id, forum_id)
);
alter table subscriptions enable row level security;
create policy "Own subs readable"   on subscriptions for select using (auth.uid() = user_id);
create policy "Own subs insertable" on subscriptions for insert with check (auth.uid() = user_id);
create policy "Own subs deletable"  on subscriptions for delete using (auth.uid() = user_id);

create or replace function update_member_count() returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then update forums set member_count = member_count + 1 where id = new.forum_id;
  elsif tg_op = 'DELETE' then update forums set member_count = greatest(0, member_count - 1) where id = old.forum_id;
  end if; return null;
end; $$;
drop trigger if exists on_subscription_change on subscriptions;
create trigger on_subscription_change after insert or delete on subscriptions
  for each row execute procedure update_member_count();

-- ─── USER ALIASES ────────────────────────────────────────────────────────────
create table if not exists user_aliases (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references profiles(id) on delete cascade,
  forum_id   uuid not null references forums(id)   on delete cascade,
  alias      text not null,
  created_at timestamptz default now(),
  unique(user_id, forum_id)
);
alter table user_aliases enable row level security;
create policy "Own aliases manageable" on user_aliases for all using (auth.uid() = user_id);
create policy "Aliases readable"       on user_aliases for select using (true);

-- ─── POSTS ───────────────────────────────────────────────────────────────────
create table if not exists posts (
  id            uuid primary key default uuid_generate_v4(),
  forum_id      uuid not null references forums(id)   on delete cascade,
  author_id     uuid not null references profiles(id) on delete cascade,
  title         text not null,
  content       text not null,
  tag           text not null default 'general',
  link_url      text,
  like_count    int default 0,
  comment_count int default 0,
  is_pinned     bool default false,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);
alter table posts enable row level security;
create policy "Posts readable"    on posts for select using (true);
create policy "Posts insertable"  on posts for insert with check (auth.uid() = author_id);
create policy "Own posts editable"  on posts for update using (auth.uid() = author_id);
create policy "Own posts deletable" on posts for delete using (auth.uid() = author_id);
create index if not exists posts_forum_idx on posts(forum_id, created_at desc);

create or replace function update_forum_post_count() returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    update forums set post_count = post_count + 1, today_count = today_count + 1 where id = new.forum_id;
    update profiles set post_count = post_count + 1 where id = new.author_id;
  elsif tg_op = 'DELETE' then
    update forums set post_count = greatest(0, post_count - 1) where id = old.forum_id;
    update profiles set post_count = greatest(0, post_count - 1) where id = old.author_id;
  end if; return null;
end; $$;
drop trigger if exists on_post_change on posts;
create trigger on_post_change after insert or delete on posts
  for each row execute procedure update_forum_post_count();

-- ─── COMMENTS ────────────────────────────────────────────────────────────────
create table if not exists comments (
  id         uuid primary key default uuid_generate_v4(),
  post_id    uuid not null references posts(id)     on delete cascade,
  parent_id  uuid           references comments(id) on delete cascade,
  author_id  uuid not null references profiles(id)  on delete cascade,
  content    text not null,
  like_count int default 0,
  created_at timestamptz default now()
);
alter table comments enable row level security;
create policy "Comments readable"    on comments for select using (true);
create policy "Comments insertable"  on comments for insert with check (auth.uid() = author_id);
create policy "Own comments editable"  on comments for update using (auth.uid() = author_id);
create policy "Own comments deletable" on comments for delete using (auth.uid() = author_id);
create index if not exists comments_post_idx   on comments(post_id, created_at);
create index if not exists comments_parent_idx on comments(parent_id);

create or replace function update_comment_count() returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then update posts set comment_count = comment_count + 1 where id = new.post_id;
  elsif tg_op = 'DELETE' then update posts set comment_count = greatest(0, comment_count - 1) where id = old.post_id;
  end if; return null;
end; $$;
drop trigger if exists on_comment_change on comments;
create trigger on_comment_change after insert or delete on comments
  for each row execute procedure update_comment_count();

-- ─── LIKES ───────────────────────────────────────────────────────────────────
create table if not exists post_likes (
  post_id uuid not null references posts(id)    on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  primary key(post_id, user_id)
);
alter table post_likes enable row level security;
create policy "Post likes readable"   on post_likes for select using (true);
create policy "Post likes manageable" on post_likes for all    using (auth.uid() = user_id);

create table if not exists comment_likes (
  comment_id uuid not null references comments(id) on delete cascade,
  user_id    uuid not null references profiles(id) on delete cascade,
  primary key(comment_id, user_id)
);
alter table comment_likes enable row level security;
create policy "Comment likes readable"   on comment_likes for select using (true);
create policy "Comment likes manageable" on comment_likes for all    using (auth.uid() = user_id);

create or replace function sync_post_likes() returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    update posts set like_count = like_count + 1 where id = new.post_id;
    update profiles set like_count = like_count + 1 where id = (select author_id from posts where id = new.post_id);
  elsif tg_op = 'DELETE' then
    update posts set like_count = greatest(0, like_count - 1) where id = old.post_id;
  end if; return null;
end; $$;
drop trigger if exists on_post_like on post_likes;
create trigger on_post_like after insert or delete on post_likes for each row execute procedure sync_post_likes();

create or replace function sync_comment_likes() returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then update comments set like_count = like_count + 1 where id = new.comment_id;
  elsif tg_op = 'DELETE' then update comments set like_count = greatest(0, like_count - 1) where id = old.comment_id;
  end if; return null;
end; $$;
drop trigger if exists on_comment_like on comment_likes;
create trigger on_comment_like after insert or delete on comment_likes for each row execute procedure sync_comment_likes();

-- ─── EMOJI REACTIONS ─────────────────────────────────────────────────────────
create table if not exists post_reactions (
  id         uuid primary key default uuid_generate_v4(),
  post_id    uuid not null references posts(id)    on delete cascade,
  user_id    uuid not null references profiles(id) on delete cascade,
  emoji      text not null,
  created_at timestamptz default now(),
  unique(post_id, user_id, emoji)
);
alter table post_reactions enable row level security;
create policy "Reactions readable"   on post_reactions for select using (true);
create policy "Reactions manageable" on post_reactions for all    using (auth.uid() = user_id);
create index if not exists post_reactions_post_idx on post_reactions(post_id);

-- ─── FIXTURES ────────────────────────────────────────────────────────────────
create table if not exists fixtures (
  id          uuid primary key default uuid_generate_v4(),
  team_id     uuid not null references teams(id) on delete cascade,
  home_team   text not null,
  away_team   text not null,
  kickoff_at  timestamptz not null,
  competition text not null,
  score_home  int,
  score_away  int,
  status      text not null default 'scheduled',  -- scheduled | live | finished
  minute      int,
  created_at  timestamptz default now()
);
alter table fixtures enable row level security;
create policy "Fixtures readable" on fixtures for select using (true);
create index if not exists fixtures_team_idx on fixtures(team_id, kickoff_at);

-- ─── MATCH FORUMS ────────────────────────────────────────────────────────────
create table if not exists match_forums (
  id           uuid primary key default uuid_generate_v4(),
  forum_id     uuid not null references forums(id)   on delete cascade,
  fixture_id   uuid not null references fixtures(id) on delete cascade,
  status       text not null default 'pending',  -- pending | active | closed | cleaned
  opened_at    timestamptz,
  closed_at    timestamptz,
  cleanup_at   timestamptz,
  created_at   timestamptz default now(),
  unique(fixture_id)
);
alter table match_forums enable row level security;
create policy "Match forums readable" on match_forums for select using (true);
create index if not exists match_forums_forum_idx on match_forums(forum_id, status);

create table if not exists match_forum_posts (
  id             uuid primary key default uuid_generate_v4(),
  match_forum_id uuid not null references match_forums(id) on delete cascade,
  author_id      uuid not null references profiles(id)     on delete cascade,
  content        text not null,
  like_count     int default 0,
  created_at     timestamptz default now()
);
alter table match_forum_posts enable row level security;
create policy "MFP readable"   on match_forum_posts for select using (true);
create policy "MFP insertable" on match_forum_posts for insert with check (auth.uid() = author_id);
create policy "MFP deletable"  on match_forum_posts for delete using (auth.uid() = author_id);
create index if not exists mfp_forum_idx on match_forum_posts(match_forum_id, created_at);

-- ─── VOICE CHAT ──────────────────────────────────────────────────────────────
create table if not exists voice_sessions (
  id         uuid primary key default uuid_generate_v4(),
  forum_id   uuid not null references forums(id) on delete cascade,
  room_name  text not null unique,
  is_active  bool default true,
  created_at timestamptz default now(),
  unique(forum_id)
);
alter table voice_sessions enable row level security;
create policy "Voice sessions readable" on voice_sessions for select using (true);

create table if not exists voice_participants (
  id          uuid primary key default uuid_generate_v4(),
  session_id  uuid not null references voice_sessions(id) on delete cascade,
  user_id     uuid not null references profiles(id)        on delete cascade,
  is_muted    bool default false,
  joined_at   timestamptz default now(),
  unique(session_id, user_id)
);
alter table voice_participants enable row level security;
create policy "VP readable"   on voice_participants for select using (true);
create policy "VP manageable" on voice_participants for all    using (auth.uid() = user_id);

-- ─── ADMIN ───────────────────────────────────────────────────────────────────
create table if not exists admin_actions (
  id          uuid primary key default uuid_generate_v4(),
  admin_id    uuid not null references profiles(id),
  action      text not null,
  target_id   uuid,
  target_type text,
  reason      text,
  created_at  timestamptz default now()
);
alter table admin_actions enable row level security;
create policy "Admin log readable by mods" on admin_actions for select
  using (exists(select 1 from profiles where id = auth.uid() and role in ('admin','moderator')));

create table if not exists user_bans (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references profiles(id) on delete cascade,
  forum_id   uuid references forums(id),
  banned_by  uuid not null references profiles(id),
  reason     text,
  expires_at timestamptz,
  created_at timestamptz default now()
);
alter table user_bans enable row level security;
create policy "Bans readable by mods" on user_bans for select
  using (exists(select 1 from profiles where id = auth.uid() and role in ('admin','moderator')));
create policy "Bans manageable by mods" on user_bans for all
  using (exists(select 1 from profiles where id = auth.uid() and role in ('admin','moderator')));

-- ─── REALTIME ────────────────────────────────────────────────────────────────
alter publication supabase_realtime add table posts;
alter publication supabase_realtime add table comments;
alter publication supabase_realtime add table post_likes;
alter publication supabase_realtime add table post_reactions;
alter publication supabase_realtime add table match_forum_posts;
alter publication supabase_realtime add table voice_participants;
