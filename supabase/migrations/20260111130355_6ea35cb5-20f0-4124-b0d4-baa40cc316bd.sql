-- Add 'absent' to attendance_status enum if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'absent' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'attendance_status')) THEN
        ALTER TYPE attendance_status ADD VALUE 'absent';
    END IF;
END $$;