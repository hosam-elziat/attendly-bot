-- Add columns for biometric credential registration
ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS biometric_credential_id TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS biometric_registered_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Add columns to biometric_pending_verifications for registration flow
ALTER TABLE public.biometric_pending_verifications 
ADD COLUMN IF NOT EXISTS verification_purpose TEXT DEFAULT 'authentication' CHECK (verification_purpose IN ('registration', 'authentication')),
ADD COLUMN IF NOT EXISTS next_verification_level INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS biometric_verified_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Add index for faster lookup of employees by credential
CREATE INDEX IF NOT EXISTS idx_employees_biometric_credential ON public.employees (biometric_credential_id) WHERE biometric_credential_id IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.employees.biometric_credential_id IS 'WebAuthn credential ID for biometric verification';
COMMENT ON COLUMN public.employees.biometric_registered_at IS 'Timestamp when biometric was first registered';
COMMENT ON COLUMN public.biometric_pending_verifications.verification_purpose IS 'Purpose of verification: registration or authentication';
COMMENT ON COLUMN public.biometric_pending_verifications.next_verification_level IS 'The attendance verification level to proceed with after biometric is verified';