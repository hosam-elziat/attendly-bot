import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ShieldCheck, XCircle, CheckCircle, Fingerprint, AlertTriangle, Smartphone } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type RegistrationStep = 'loading' | 'register' | 'success' | 'error' | 'expired' | 'unsupported';

interface RegistrationData {
  employeeId: string;
  employeeName: string;
  companyId: string;
  expiresAt: Date;
}

const RegisterBiometric = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  
  const [step, setStep] = useState<RegistrationStep>('loading');
  const [registrationData, setRegistrationData] = useState<RegistrationData | null>(null);
  const [error, setError] = useState<string>('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [isSupported, setIsSupported] = useState<boolean | null>(null);

  useEffect(() => {
    const initialize = async () => {
      if (!token) {
        setStep('error');
        setError('رابط غير صالح');
        return;
      }
      
      // First check WebAuthn support
      const supported = await checkWebAuthnSupport();
      
      // Then validate token
      await validateToken(token, supported);
    };
    
    initialize();
  }, [token]);

  const checkWebAuthnSupport = async (): Promise<boolean> => {
    try {
      // Check if WebAuthn API exists
      if (!window.PublicKeyCredential) {
        console.log('WebAuthn API not available');
        setIsSupported(false);
        return false;
      }

      // Check if platform authenticator is available
      const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      console.log('Platform authenticator available:', available);
      setIsSupported(available);
      
      // Even if platform authenticator is not available, we can try with cross-platform authenticators
      // Some devices may still support fingerprint through alternative methods
      return available;
    } catch (error) {
      console.error('Error checking WebAuthn support:', error);
      setIsSupported(false);
      return false;
    }
  };

  const validateToken = async (verificationToken: string, deviceSupported: boolean) => {
    try {
      const { data, error } = await supabase.functions.invoke('biometric-verification', {
        body: { 
          action: 'validate-registration',
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

      setRegistrationData({
        employeeId: data.employeeId,
        employeeName: data.employeeName,
        companyId: data.companyId,
        expiresAt: new Date(data.expiresAt)
      });
      
      // Check if device supports biometrics using the passed value
      if (!deviceSupported) {
        setStep('unsupported');
      } else {
        setStep('register');
      }
    } catch (err: any) {
      console.error('Token validation error:', err);
      setStep('error');
      setError('حدث خطأ أثناء التحقق. حاول مرة أخرى.');
    }
  };

  const startBiometricRegistration = async () => {
    if (!token || !registrationData) return;

    setIsRegistering(true);

    try {
      // Generate a unique user ID for this registration
      const userId = new TextEncoder().encode(registrationData.employeeId);
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);

      // Create new credential - try with less restrictive options first
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: {
            name: "Attendly Bot",
            id: window.location.hostname,
          },
          user: {
            id: userId,
            name: registrationData.employeeName,
            displayName: registrationData.employeeName,
          },
          pubKeyCredParams: [
            { alg: -7, type: 'public-key' },  // ES256
            { alg: -257, type: 'public-key' }, // RS256
          ],
          authenticatorSelection: {
            // Remove 'platform' restriction to allow both platform and roaming authenticators
            // This allows more devices to register
            userVerification: 'preferred', // Changed from 'required' to 'preferred'
            residentKey: 'preferred',
          },
          timeout: 120000, // Increased timeout to 2 minutes
          attestation: 'none',
        }
      }) as PublicKeyCredential;

      if (!credential) {
        throw new Error('Failed to create credential');
      }

      // Get the credential ID
      const credentialId = btoa(String.fromCharCode(...new Uint8Array(credential.rawId)));

      // Send to server to complete registration
      const { data, error } = await supabase.functions.invoke('biometric-verification', {
        body: {
          action: 'complete-registration',
          token,
          credentialId
        }
      });

      if (error) throw error;

      if (data?.success) {
        setStep('success');
        toast.success('تم تسجيل البصمة بنجاح!');
      } else {
        throw new Error(data?.message || 'فشل تسجيل البصمة');
      }
    } catch (err: any) {
      console.error('Biometric registration failed:', err);
      
      if (err.name === 'NotAllowedError') {
        toast.error('تم رفض التسجيل أو انتهت المهلة');
      } else if (err.name === 'NotSupportedError') {
        setStep('unsupported');
        return;
      } else {
        toast.error(err.message || 'فشل تسجيل البصمة');
      }
    } finally {
      setIsRegistering(false);
    }
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

      case 'register':
        return (
          <div className="flex flex-col items-center justify-center p-8 space-y-6">
            <div className="p-6 rounded-full bg-primary/10 relative">
              <Fingerprint className="w-20 h-20 text-primary" />
              {isRegistering && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-full h-full rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
                </div>
              )}
            </div>
            
            <div className="text-center space-y-2">
              {registrationData?.employeeName && (
                <p className="text-sm text-muted-foreground">مرحباً، {registrationData.employeeName}</p>
              )}
              <h3 className="text-xl font-semibold">تسجيل البصمة</h3>
              <p className="text-muted-foreground">
                سيتم استخدام بصمتك للتحقق من هويتك عند تسجيل الحضور والانصراف
              </p>
            </div>

            <div className="bg-muted/50 p-4 rounded-lg text-sm text-muted-foreground max-w-sm">
              <p className="flex items-start gap-2">
                <ShieldCheck className="w-5 h-5 mt-0.5 flex-shrink-0 text-green-500" />
                <span>بصمتك آمنة تماماً ولا تغادر جهازك. يتم تخزين معرف التحقق فقط.</span>
              </p>
            </div>

            <Button 
              onClick={startBiometricRegistration} 
              disabled={isRegistering}
              className="w-full max-w-xs"
              size="lg"
            >
              {isRegistering ? (
                <>
                  <Loader2 className="w-5 h-5 me-2 animate-spin" />
                  جارٍ التسجيل...
                </>
              ) : (
                <>
                  <Fingerprint className="w-5 h-5 me-2" />
                  تسجيل البصمة الآن
                </>
              )}
            </Button>
          </div>
        );

      case 'unsupported':
        return (
          <div className="flex flex-col items-center justify-center p-12 space-y-6">
            <div className="p-6 rounded-full bg-amber-500/10">
              <Smartphone className="w-20 h-20 text-amber-500" />
            </div>
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-amber-600">
                جهازك لا يدعم البصمة
              </h2>
              <p className="text-muted-foreground">
                لا يمكن تسجيل البصمة على هذا الجهاز.
              </p>
              <p className="text-muted-foreground text-sm">
                حاول من جهاز يدعم البصمة أو Face ID
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

      case 'success':
        return (
          <div className="flex flex-col items-center justify-center p-12 space-y-6">
            <div className="p-6 rounded-full bg-green-500/10">
              <CheckCircle className="w-20 h-20 text-green-500" />
            </div>
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-green-600">
                تم التسجيل بنجاح!
              </h2>
              <p className="text-muted-foreground">
                يمكنك الآن استخدام بصمتك لتسجيل الحضور والانصراف
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
              <AlertTriangle className="w-20 h-20 text-amber-500" />
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
              <Fingerprint className="w-8 h-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-xl">تسجيل البصمة</CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            تسجيل بصمة جديدة للتحقق من الهوية
          </p>
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
            هذه الصفحة تستخدم تقنية WebAuthn للتسجيل الآمن. 
            لا يتم تخزين بيانات البصمة خارج جهازك.
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterBiometric;
