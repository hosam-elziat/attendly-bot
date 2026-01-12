-- Enable realtime for tables that need notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.join_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.leave_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance_logs;