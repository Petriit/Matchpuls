-- ═══════════════════════════════════════════════════════════════════════════
-- MATCHPULS – Fix public-read RLS for profile pages
-- Kör i: Supabase Dashboard → SQL Editor → Run
-- OBS: Kör 002_badges.sql INNAN denna om du inte redan gjort det.
-- ═══════════════════════════════════════════════════════════════════════════

-- Allow anyone to read subscriptions (needed for public profile "X forum" display)
CREATE POLICY "Subs publicly readable"
  ON subscriptions FOR SELECT USING (true);

-- Allow anyone to read earned forum badges (needed for public profile badges section)
-- (Only run if user_forum_badges exists, i.e. after 002_badges.sql has been run)
DROP POLICY IF EXISTS "Users view own badges" ON user_forum_badges;
CREATE POLICY "Forum badges publicly readable"
  ON user_forum_badges FOR SELECT USING (true);
