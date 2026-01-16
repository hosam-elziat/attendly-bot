-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net extension for making HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create a cron job that runs every minute to call the attendance-reminders function
SELECT cron.schedule(
  'attendance-reminders-job',
  '* * * * *', -- Every minute
  $$
  SELECT net.http_post(
    url := 'https://seqqfrtnrjngvqidtrcp.supabase.co/functions/v1/attendance-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNlcXFmcnRucmpuZ3ZxaWR0cmNwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2NDQ0NDAsImV4cCI6MjA4MzIyMDQ0MH0.toSzt6hj1Q6ieNKfHe1kOcswGg2XGCz7wA_5IUa75TY'
    ),
    body := '{}'::jsonb
  );
  $$
);