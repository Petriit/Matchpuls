-- Reset all users to offline (clears stale is_online=true values from before the presence-leave fix)
-- Safe to run at any time; the presence system will re-set online=true for active users within seconds.
UPDATE profiles SET is_online = false;
