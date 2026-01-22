import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ShieldCheck, XCircle, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import BiometricVerification from '@/components/biometric/BiometricVerification';
import OTPVerification from '@/components/biometric/OTPVerification';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type VerificationStep = 'loading' | 'biometric' | 'otp' | 'success' | 'error' | 'expired';

interface VerificationData {
  employeeId: string;
  employeeName: string;
  companyId: string;
  requestType: 'check_in' | 'check_out';
  expiresAt: Date;
  otpFallbackEnabled: boolean;
}

const VerifyAttendance = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  
  const [step, setStep] = useState<VerificationStep>('loading');
  const [verificationData, setVerificationData] = useState<VerificationData | null>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (token) {
      validateToken(token);
    } else {
      setStep('error');
      setError('رابط غير صالح');
    }
  }, [token]);

  const validateToken = async (verificationToken: string) => {
    try {
      // Call the biometric-verification edge function to validate token
      const { data, error } = await supabase.functions.invoke('biometric-verification', {
        body: { 
          action: 'validate',
          token: verificationToken 
        }
      });

      if (error || !data?.valid) {
        if (data?.expired) {
          setStep('expired');
        } else {
          setStep('error');
          setError(data?.message || 'رابط غير صالح أو منتهي الصلاحية');
        }
        return;
      }

      setVerificationData({
        employeeId: data.employeeId,
        employeeName: data.employeeName,
        companyId: data.companyId,
        requestType: data.requestType,
        expiresAt: new Date(data.expiresAt),
        otpFallbackEnabled: data.otpFallbackEnabled
      });
      
      setStep('biometric');
    } catch (err: any) {
      console.error('Token validation error:', err);
      setStep('error');
      setError('حدث خطأ أثناء التحقق. حاول مرة أخرى.');
    }
  };

  const handleBiometricSuccess = async () => {
    if (!token || !verificationData) return;

    try {
      const { data, error } = await supabase.functions.invoke('biometric-verification', {
        body: {
          action: 'complete',
          token,
          verificationType: 'biometric'
        }
      });

      if (error) throw error;

      setStep('success');
    } catch (err: any) {
      console.error('Completion error:', err);
      toast.error('فشل تسجيل الحضور');
      setStep('error');
      setError('فشل تسجيل الحضور. حاول مرة أخرى.');
    }
  };

  const handleFallbackToOTP = async () => {
    if (!token || !verificationData?.otpFallbackEnabled) {
      toast.error('رمز التحقق غير متاح');
      return;
    }

    try {
      // Request OTP to be sent
      const { data, error } = await supabase.functions.invoke('biometric-verification', {
        body: {
          action: 'send-otp',
          token
        }
      });

      if (error) throw error;

      setStep('otp');
      toast.success('تم إرسال رمز التحقق إلى التيليجرام');
    } catch (err: any) {
      console.error('OTP send error:', err);
      toast.error('فشل إرسال رمز التحقق');
    }
  };

  const handleOTPVerify = async (otp: string): Promise<boolean> => {
    if (!token) return false;

    try {
      const { data, error } = await supabase.functions.invoke('biometric-verification', {
        body: {
          action: 'verify-otp',
          token,
          otp
        }
      });

      if (error) throw error;

      if (data?.success) {
        setStep('success');
        return true;
      }

      return false;
    } catch (err) {
      console.error('OTP verify error:', err);
      return false;
    }
  };

  const handleResendOTP = async () => {
    if (!token) return;

    await supabase.functions.invoke('biometric-verification', {
      body: {
        action: 'send-otp',
        token
      }
    });
  };

  const renderContent = () => {
    switch (step) {
      case 'loading':
        return (
          <div className="flex flex-col items-center justify-center p-12 space-y-4">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
            <p className="text-muted-foreground">جارٍ التحقق من الرابط...</p>
          </div>
        );

      case 'biometric':
        return (
          <BiometricVerification
            onSuccess={handleBiometricSuccess}
            onFallbackToOTP={handleFallbackToOTP}
            employeeName={verificationData?.employeeName}
          />
        );

      case 'otp':
        return (
          <OTPVerification
            onVerify={handleOTPVerify}
            onResendOTP={handleResendOTP}
            expiresAt={verificationData?.expiresAt}
            maxAttempts={3}
          />
        );

      case 'success':
        return (
          <div className="flex flex-col items-center justify-center p-12 space-y-6">
            <div className="p-6 rounded-full bg-green-500/10">
              <CheckCircle className="w-20 h-20 text-green-500" />
            </div>
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-green-600">
                تم التحقق بنجاح!
              </h2>
              <p className="text-muted-foreground">
                {verificationData?.requestType === 'check_in' 
                  ? 'تم تسجيل حضورك بنجاح ✅'
                  : 'تم تسجيل انصرافك بنجاح ✅'
                }
              </p>
              <p className="text-sm text-muted-foreground mt-4">
                يمكنك إغلاق هذه الصفحة والعودة إلى التيليجرام
              </p>
            </div>
          </div>
        );

      case 'expired':
        return (
          <div className="flex flex-col items-center justify-center p-12 space-y-6">
            <div className="p-6 rounded-full bg-amber-500/10">
              <Clock className="w-20 h-20 text-amber-500" />
            </div>
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-amber-600">
                انتهت صلاحية الرابط
              </h2>
              <p className="text-muted-foreground">
                يرجى طلب رابط جديد من التيليجرام
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => window.close()}
            >
              إغلاق الصفحة
            </Button>
          </div>
        );

      case 'error':
        return (
          <div className="flex flex-col items-center justify-center p-12 space-y-6">
            <div className="p-6 rounded-full bg-destructive/10">
              <XCircle className="w-20 h-20 text-destructive" />
            </div>
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-destructive">
                خطأ
              </h2>
              <p className="text-muted-foreground">{error}</p>
            </div>
            <Button
              variant="outline"
              onClick={() => window.close()}
            >
              إغلاق الصفحة
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center border-b">
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-full bg-primary/10">
              <ShieldCheck className="w-8 h-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-xl">التحقق من الهوية</CardTitle>
          {verificationData && (
            <p className="text-sm text-muted-foreground mt-2">
              {verificationData.requestType === 'check_in' 
                ? 'تسجيل الحضور'
                : 'تسجيل الانصراف'
              }
            </p>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {renderContent()}
        </CardContent>
      </Card>

      {/* Security notice */}
      <div className="fixed bottom-4 left-4 right-4 max-w-md mx-auto">
        <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <p>
            هذه الصفحة تستخدم تقنية WebAuthn للتحقق من هويتك بأمان. 
            لا يتم تخزين بيانات البصمة خارج جهازك.
          </p>
        </div>
      </div>
    </div>
  );
};

export default VerifyAttendance;
