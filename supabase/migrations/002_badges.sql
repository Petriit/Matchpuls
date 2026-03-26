-- ═══════════════════════════════════════════════════════════════════════════
-- MATCHPULS – Badge System
-- Kör i: Supabase Dashboard → SQL Editor → Run
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── Badge definitions (global, same criteria for every forum) ───────────────
CREATE TABLE IF NOT EXISTS forum_badges (
  id             text primary key,
  emoji          text not null,
  name           text not null,
  description    text not null,
  rarity         text not null default 'bronze',  -- bronze | silver | gold | legend
  criteria_type  text not null,                   -- post_count | comment_count | likes_received | match_forum | tactic_count | night_post
  criteria_value int  not null default 1
);
ALTER TABLE forum_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Badges readable" ON forum_badges FOR SELECT USING (true);

INSERT INTO forum_badges (id, emoji, name, description, rarity, criteria_type, criteria_value) VALUES
  ('megaphone',    '📣',  'Megafon',      'Ditt första inlägg i forumet',        'bronze', 'post_count',     1),
  ('regular',      '📝',  'Fast inlägg',  '10 inlägg i forumet',                 'bronze', 'post_count',     10),
  ('active',       '🎙️', 'Aktiv fan',    '50 inlägg i forumet',                 'silver', 'post_count',     50),
  ('ultras',       '🔥',  'Ultras',        '100 inlägg i forumet',                'silver', 'post_count',     100),
  ('diamond',      '💎',  'Diamant',       '500 inlägg i forumet',                'gold',   'post_count',     500),
  ('legend',       '👑',  'Legend',        '1 000 inlägg – en sann legend',       'legend', 'post_count',     1000),
  ('commentator',  '💬',  'Pratkvarn',     '25 kommentarer i forumet',            'bronze', 'comment_count',  25),
  ('debater',      '🗣️', 'Debattör',     '100 kommentarer i forumet',           'silver', 'comment_count',  100),
  ('match_fan',    '⚡',  'Matchgalen',    'Postat i ett live matchforum',         'silver', 'match_forum',    1),
  ('analyst',      '📊',  'Analytiker',    '5 inlägg med taktik-ämne',            'bronze', 'tactic_count',   5),
  ('night_owl',    '🌙',  'Nattskift',     '3 inlägg publicerade 00–04',          'silver', 'night_post',     3),
  ('liked',        '❤️', 'Folkkär',      '50 gillningar på dina inlägg',        'silver', 'likes_received', 50),
  ('beloved',      '⭐',  'Älskad',        '200 gillningar på dina inlägg',       'gold',   'likes_received', 200)
ON CONFLICT (id) DO NOTHING;

-- ─── Earned badges per user per forum ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_forum_badges (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references profiles(id) on delete cascade,
  forum_id   uuid not null references forums(id) on delete cascade,
  badge_id   text not null references forum_badges(id),
  earned_at  timestamptz default now(),
  unique(user_id, forum_id, badge_id)
);
ALTER TABLE user_forum_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own badges"   ON user_forum_badges FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service insert badges"   ON user_forum_badges FOR INSERT WITH CHECK (true);

-- ─── Extend user_aliases: which badge is currently equipped ──────────────────
ALTER TABLE user_aliases ADD COLUMN IF NOT EXISTS selected_badge text REFERENCES forum_badges(id);

-- ─── Denormalized badge emoji on posts & comments (set at insert time) ───────
ALTER TABLE posts    ADD COLUMN IF NOT EXISTS author_badge text;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS author_badge text;

-- ─── Trigger: stamp author_badge on new post ─────────────────────────────────
CREATE OR REPLACE FUNCTION set_post_author_badge()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE v_emoji text;
BEGIN
  SELECT fb.emoji INTO v_emoji
  FROM user_aliases ua
  JOIN forum_badges fb ON fb.id = ua.selected_badge
  WHERE ua.user_id = NEW.author_id AND ua.forum_id = NEW.forum_id;
  NEW.author_badge := v_emoji;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_post_author_badge ON posts;
CREATE TRIGGER trg_post_author_badge
  BEFORE INSERT ON posts
  FOR EACH ROW EXECUTE FUNCTION set_post_author_badge();

-- ─── Trigger: stamp author_badge on new comment ──────────────────────────────
CREATE OR REPLACE FUNCTION set_comment_author_badge()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_forum_id uuid;
  v_emoji    text;
BEGIN
  SELECT forum_id INTO v_forum_id FROM posts WHERE id = NEW.post_id;
  SELECT fb.emoji INTO v_emoji
  FROM user_aliases ua
  JOIN forum_badges fb ON fb.id = ua.selected_badge
  WHERE ua.user_id = NEW.author_id AND ua.forum_id = v_forum_id;
  NEW.author_badge := v_emoji;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_comment_author_badge ON comments;
CREATE TRIGGER trg_comment_author_badge
  BEFORE INSERT ON comments
  FOR EACH ROW EXECUTE FUNCTION set_comment_author_badge();

-- ─── RPC: get badge progress for user in one forum ───────────────────────────
CREATE OR REPLACE FUNCTION get_forum_badge_progress(p_user_id uuid, p_forum_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  RETURN jsonb_build_object(
    'post_count',     (SELECT COUNT(*)::int    FROM posts WHERE author_id = p_user_id AND forum_id = p_forum_id AND title = ''),
    'comment_count',  (SELECT COUNT(*)::int    FROM comments c JOIN posts p ON c.post_id = p.id WHERE c.author_id = p_user_id AND p.forum_id = p_forum_id),
    'likes_received', (SELECT COALESCE(SUM(like_count),0)::int FROM posts WHERE author_id = p_user_id AND forum_id = p_forum_id AND title = ''),
    'match_forum',    (SELECT COUNT(*)::int    FROM match_forum_posts mfp JOIN match_forums mf ON mfp.match_forum_id = mf.id WHERE mfp.author_id = p_user_id AND mf.forum_id = p_forum_id),
    'tactic_count',   (SELECT COUNT(*)::int    FROM posts WHERE author_id = p_user_id AND forum_id = p_forum_id AND tag = 'tactic'),
    'night_post',     (SELECT COUNT(*)::int    FROM posts WHERE author_id = p_user_id AND forum_id = p_forum_id AND title = '' AND EXTRACT(HOUR FROM created_at AT TIME ZONE 'Europe/Stockholm') < 5)
  );
END;
$$;
