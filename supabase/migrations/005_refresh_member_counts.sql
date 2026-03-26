-- Recount member_count for all forums from the subscriptions table
-- (fixes stale counts if trigger was missing or failed)
UPDATE forums f
SET member_count = (
  SELECT COUNT(*) FROM subscriptions s WHERE s.forum_id = f.id
);

-- Also fix the trigger to properly handle DELETE (return OLD, not NEW)
CREATE OR REPLACE FUNCTION update_member_count()
RETURNS trigger LANGUAGE plpgsql
SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE forums SET member_count = member_count + 1 WHERE id = NEW.forum_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE forums SET member_count = GREATEST(0, member_count - 1) WHERE id = OLD.forum_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;
