-- SQL script to set up pg_cron for scheduled messages
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)

-- First, enable the pg_cron extension (may already be enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Grant usage to postgres user
GRANT USAGE ON SCHEMA cron TO postgres;

-- Create a function to process scheduled messages directly in PostgreSQL
-- This is an alternative to using Edge Functions
CREATE OR REPLACE FUNCTION process_scheduled_messages()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Update messages where scheduledAt has passed
  -- Set scheduledAt to NULL to "publish" them
  -- Update createdAt to the scheduled time so they appear in order
  UPDATE messages
  SET 
    "scheduledAt" = NULL,
    "createdAt" = COALESCE("scheduledAt", "createdAt"),
    "updatedAt" = NOW()
  WHERE 
    "scheduledAt" IS NOT NULL 
    AND "scheduledAt" <= NOW();
END;
$$;

-- Schedule the function to run every minute
SELECT cron.schedule(
  'process-scheduled-messages',  -- job name
  '* * * * *',                   -- cron expression (every minute)
  $$SELECT process_scheduled_messages()$$
);

-- To view scheduled jobs:
-- SELECT * FROM cron.job;

-- To unschedule:
-- SELECT cron.unschedule('process-scheduled-messages');

-- To run manually (for testing):
-- SELECT process_scheduled_messages();
