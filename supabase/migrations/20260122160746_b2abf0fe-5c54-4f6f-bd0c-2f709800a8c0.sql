-- إضافة أعمدة التحقق بالبصمة للشركات
ALTER TABLE companies ADD COLUMN IF NOT EXISTS biometric_verification_enabled BOOLEAN DEFAULT false;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS biometric_otp_fallback BOOLEAN DEFAULT true;

-- إضافة أعمدة التحقق بالبصمة للموظفين
ALTER TABLE employees ADD COLUMN IF NOT EXISTS biometric_verification_enabled BOOLEAN;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS biometric_credential_id TEXT;

-- جدول لتخزين رموز OTP للتحقق
CREATE TABLE IF NOT EXISTS biometric_otp_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  otp_code VARCHAR(6) NOT NULL,
  request_type VARCHAR(20) NOT NULL,
  verification_token UUID NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  attempts INTEGER DEFAULT 0
);

-- جدول لتتبع محاولات التحقق
CREATE TABLE IF NOT EXISTS biometric_verification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  verification_type VARCHAR(20) NOT NULL,
  success BOOLEAN NOT NULL,
  device_info TEXT,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- جدول لتخزين جلسات التحقق المعلقة
CREATE TABLE IF NOT EXISTS biometric_pending_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  verification_token UUID NOT NULL UNIQUE,
  request_type VARCHAR(20) NOT NULL,
  telegram_chat_id TEXT NOT NULL,
  location_lat DOUBLE PRECISION,
  location_lng DOUBLE PRECISION,
  expires_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- إنشاء الفهارس
CREATE INDEX IF NOT EXISTS idx_biometric_otp_token ON biometric_otp_codes(verification_token);
CREATE INDEX IF NOT EXISTS idx_biometric_otp_expires ON biometric_otp_codes(expires_at);
CREATE INDEX IF NOT EXISTS idx_biometric_pending_token ON biometric_pending_verifications(verification_token);
CREATE INDEX IF NOT EXISTS idx_biometric_pending_expires ON biometric_pending_verifications(expires_at);
CREATE INDEX IF NOT EXISTS idx_biometric_logs_employee ON biometric_verification_logs(employee_id);

-- تفعيل RLS
ALTER TABLE biometric_otp_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE biometric_verification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE biometric_pending_verifications ENABLE ROW LEVEL SECURITY;

-- سياسات RLS للـ OTP codes
CREATE POLICY "Service role can manage otp codes" ON biometric_otp_codes
  FOR ALL USING (true) WITH CHECK (true);

-- سياسات RLS للـ verification logs  
CREATE POLICY "Admins can view company verification logs" ON biometric_verification_logs
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Service role can insert verification logs" ON biometric_verification_logs
  FOR INSERT WITH CHECK (true);

-- سياسات RLS للـ pending verifications
CREATE POLICY "Service role can manage pending verifications" ON biometric_pending_verifications
  FOR ALL USING (true) WITH CHECK (true);

-- دالة لتنظيف السجلات المنتهية الصلاحية
CREATE OR REPLACE FUNCTION cleanup_expired_biometric_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- حذف رموز OTP المنتهية
  DELETE FROM biometric_otp_codes WHERE expires_at < now();
  
  -- حذف جلسات التحقق المنتهية
  DELETE FROM biometric_pending_verifications WHERE expires_at < now() AND completed_at IS NULL;
END;
$$;