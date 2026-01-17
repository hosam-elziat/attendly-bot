-- Drop the existing check constraint and add a new one that includes 'full_system'
ALTER TABLE public.backups DROP CONSTRAINT IF EXISTS backups_backup_type_check;

ALTER TABLE public.backups ADD CONSTRAINT backups_backup_type_check 
CHECK (backup_type IN ('automatic', 'manual', 'full_system'));