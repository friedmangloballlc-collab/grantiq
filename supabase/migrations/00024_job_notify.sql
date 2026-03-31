-- LISTEN/NOTIFY for instant job pickup
-- Note: pg_notify works on Supabase Pro/Team plans. On free tier the trigger
-- will still fire but worker LISTEN may silently fail — polling fallback ensures
-- no jobs are lost in either case.

CREATE OR REPLACE FUNCTION notify_new_job() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM pg_notify('new_job', NEW.id::text);
  RETURN NEW;
END;
$$;

CREATE TRIGGER job_queue_notify
  AFTER INSERT ON job_queue
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_job();
