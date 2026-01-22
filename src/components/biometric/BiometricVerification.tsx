import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Fingerprint, Loader2, CheckCircle, XCircle, Smartphone } from 'lucide-react';
import { toast } from 'sonner';

interface BiometricVerificationProps {
  onSuccess: () => void;
  onFallbackToOTP: () => void;
  employeeName?: string;
}

const BiometricVerification = ({ onSuccess, onFallbackToOTP, employeeName }: BiometricVerificationProps) => {
  const [isSupported, setIsSupported] = useState<boolean | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'success' | 'failed'>('idle');

  useEffect(() => {
    checkWebAuthnSupport();
  }, []);

  const checkWebAuthnSupport = async () => {
    try {
      // Check if WebAuthn is available
      if (!window.PublicKeyCredential) {
        setIsSupported(false);
        return;
      }

      // Check if platform authenticator (fingerprint/face) is available
      const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      setIsSupported(available);

      if (!available) {
        console.log('Platform authenticator not available, will fall back to OTP');
      }
    } catch (error) {
      console.error('Error checking WebAuthn support:', error);
      setIsSupported(false);
    }
  };

  const startBiometricVerification = async () => {
    if (!isSupported) {
      onFallbackToOTP();
      return;
    }

    setIsVerifying(true);
    setVerificationStatus('idle');

    try {
      // Create a challenge for the authentication
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);

      // Request biometric authentication
      const credential = await navigator.credentials.get({
        publicKey: {
          challenge,
          timeout: 60000,
          userVerification: 'required',
          rpId: window.location.hostname,
        }
      });

      if (credential) {
        setVerificationStatus('success');
        toast.success('تم التحقق من هويتك بنجاح!');
        setTimeout(() => {
          onSuccess();
        }, 1000);
      } else {
        throw new Error('No credential received');
      }
    } catch (error: any) {
      console.error('Biometric verification failed:', error);
      
      // Handle specific errors
      if (error.name === 'NotAllowedError') {
        toast.error('تم رفض التحقق أو انتهت المهلة');
      } else if (error.name === 'NotSupportedError') {
        toast.error('جهازك لا يدعم هذا النوع من التحقق');
        onFallbackToOTP();
        return;
      } else {
        toast.error('فشل التحقق من الهوية');
      }
      
      setVerificationStatus('failed');
    } finally {
      setIsVerifying(false);
    }
  };

  // Still checking support
  if (isSupported === null) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
        <p className="text-muted-foreground">جارٍ التحقق من دعم الجهاز...</p>
      </div>
    );
  }

  // Device doesn't support biometric
  if (!isSupported) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-6">
        <div className="p-4 rounded-full bg-amber-500/10">
          <Smartphone className="w-16 h-16 text-amber-500" />
        </div>
        <div className="text-center space-y-2">
          <h3 className="text-xl font-semibold">جهازك لا يدعم البصمة</h3>
          <p className="text-muted-foreground">
            سيتم إرسال رمز تحقق إلى حسابك في التيليجرام
          </p>
        </div>
        <Button onClick={onFallbackToOTP} className="w-full max-w-xs">
          استخدام رمز التحقق
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center p-8 space-y-6">
      {verificationStatus === 'success' ? (
        <>
          <div className="p-4 rounded-full bg-green-500/10 animate-pulse">
            <CheckCircle className="w-16 h-16 text-green-500" />
          </div>
          <div className="text-center space-y-2">
            <h3 className="text-xl font-semibold text-green-600">تم التحقق بنجاح!</h3>
            <p className="text-muted-foreground">جارٍ تسجيل حضورك...</p>
          </div>
        </>
      ) : verificationStatus === 'failed' ? (
        <>
          <div className="p-4 rounded-full bg-destructive/10">
            <XCircle className="w-16 h-16 text-destructive" />
          </div>
          <div className="text-center space-y-2">
            <h3 className="text-xl font-semibold text-destructive">فشل التحقق</h3>
            <p className="text-muted-foreground">يمكنك المحاولة مرة أخرى أو استخدام رمز التحقق</p>
          </div>
          <div className="flex flex-col gap-3 w-full max-w-xs">
            <Button onClick={startBiometricVerification} disabled={isVerifying}>
              {isVerifying && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
              إعادة المحاولة
            </Button>
            <Button variant="outline" onClick={onFallbackToOTP}>
              استخدام رمز التحقق
            </Button>
          </div>
        </>
      ) : (
        <>
          <div className="p-6 rounded-full bg-primary/10 relative">
            <Fingerprint className="w-20 h-20 text-primary" />
            {isVerifying && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-full h-full rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
              </div>
            )}
          </div>
          
          <div className="text-center space-y-2">
            {employeeName && (
              <p className="text-sm text-muted-foreground">مرحباً، {employeeName}</p>
            )}
            <h3 className="text-xl font-semibold">التحقق من الهوية</h3>
            <p className="text-muted-foreground">
              ضع إصبعك على مستشعر البصمة أو استخدم Face ID
            </p>
          </div>

          <div className="flex flex-col gap-3 w-full max-w-xs">
            <Button 
              onClick={startBiometricVerification} 
              disabled={isVerifying}
              className="w-full"
              size="lg"
            >
              {isVerifying ? (
                <>
                  <Loader2 className="w-5 h-5 me-2 animate-spin" />
                  جارٍ التحقق...
                </>
              ) : (
                <>
                  <Fingerprint className="w-5 h-5 me-2" />
                  بدء التحقق بالبصمة
                </>
              )}
            </Button>
            
            <Button 
              variant="ghost" 
              onClick={onFallbackToOTP}
              className="text-muted-foreground"
            >
              استخدام رمز التحقق بدلاً من ذلك
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

export default BiometricVerification;
