
-- Enable Realtime for the 'tasks' table
-- This is often required for the client to receive updates
begin;
  -- Check if the table exists first to avoid errors
  drop publication if exists supabase_realtime;
  create publication supabase_realtime for all tables;
commit;
