import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ShieldCheck, XCircle, CheckCircle, Fingerprint, AlertTriangle, Smartphone, Copy, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type RegistrationStep = 'loading' | 'register' | 'success' | 'error' | 'expired' | 'unsupported' | 'telegram-browser';

interface RegistrationData {
  employeeId: string;
  employeeName: string;
  companyId: string;
  expiresAt: Date;
}

// Detect if running inside Telegram's in-app browser
const isTelegramBrowser = (): boolean => {
  const ua = navigator.userAgent.toLowerCase();
  return ua.includes('telegram') || 
         ua.includes('tgweb') || 
         ua.includes('webview') ||
         // Check if opened from Telegram on iOS
         (ua.includes('iphone') && ua.includes('mobile') && !ua.includes('safari')) ||
         // Check if window.TelegramWebviewProxy exists (Telegram WebApp)
         typeof (window as any).TelegramWebviewProxy !== 'undefined' ||
         typeof (window as any).Telegram !== 'undefined';
};

const RegisterBiometric = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  
  const [step, setStep] = useState<RegistrationStep>('loading');
  const [registrationData, setRegistrationData] = useState<RegistrationData | null>(null);
  const [error, setError] = useState<string>('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [isSupported, setIsSupported] = useState<boolean | null>(null);
  const [isTelegram, setIsTelegram] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const initialize = async () => {
      // Check if in Telegram browser first
      const inTelegram = isTelegramBrowser();
      setIsTelegram(inTelegram);
      
      if (!token) {
        setStep('error');
        setError('رابط غير صالح');
        return;
      }
      
      // If in Telegram browser, show the "open in browser" prompt
      if (inTelegram) {
        setStep('telegram-browser');
        return;
      }
      
      // Validate token first, we'll check biometric support when user tries to register
      await validateToken(token);
    };
    
    initialize();
  }, [token]);

  const validateToken = async (verificationToken: string) => {
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
      
      // Always show register step - we'll check support when user tries to register
      setStep('register');
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
      // Check WebAuthn support first
      if (!window.PublicKeyCredential) {
        console.error('WebAuthn API not available - PublicKeyCredential is undefined');
        setError('متصفحك لا يدعم تقنية WebAuthn. جرب متصفح Chrome أو Safari.');
        setStep('unsupported');
        setIsRegistering(false);
        return;
      }

      // Check if we're in a cross-origin iframe (which blocks WebAuthn)
      const isInIframe = window.self !== window.top;
      if (isInIframe) {
        console.warn('Running in iframe - WebAuthn may be blocked');
      }

      console.log('Starting WebAuthn credential creation...');
      console.log('Hostname:', window.location.hostname);
      console.log('Is secure context:', window.isSecureContext);

      // Generate a unique user ID for this registration
      const userId = new TextEncoder().encode(registrationData.employeeId);
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);

      // Create new credential with maximum compatibility
      const publicKeyOptions: PublicKeyCredentialCreationOptions = {
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
          { alg: -7, type: 'public-key' },   // ES256
          { alg: -257, type: 'public-key' }, // RS256
          { alg: -37, type: 'public-key' },  // PS256
        ],
        authenticatorSelection: {
          userVerification: 'preferred',
          residentKey: 'discouraged', // More compatible
        },
        timeout: 120000,
        attestation: 'none',
      };

      console.log('WebAuthn options:', JSON.stringify(publicKeyOptions, null, 2));

      const credential = await navigator.credentials.create({
        publicKey: publicKeyOptions
      }) as PublicKeyCredential;

      if (!credential) {
        throw new Error('Failed to create credential - null returned');
      }

      console.log('Credential created successfully:', credential.id);

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
      console.error('Error name:', err.name);
      console.error('Error message:', err.message);
      
      if (err.name === 'NotAllowedError') {
        toast.error('تم رفض التسجيل أو انتهت المهلة. تأكد من السماح للمتصفح بالوصول للبصمة.');
      } else if (err.name === 'NotSupportedError') {
        setError('هذا المتصفح لا يدعم البصمة. جرب فتح الرابط في متصفح Chrome أو Safari.');
        setStep('unsupported');
        return;
      } else if (err.name === 'SecurityError') {
        setError('خطأ أمني: جرب فتح الرابط مباشرة في المتصفح وليس من داخل تطبيق آخر.');
        setStep('unsupported');
        return;
      } else if (err.name === 'InvalidStateError') {
        toast.error('البصمة مسجلة مسبقاً على هذا الجهاز.');
      } else {
        toast.error(err.message || 'فشل تسجيل البصمة. جرب مرة أخرى.');
      }
    } finally {
      setIsRegistering(false);
    }
  };

  const copyLinkToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      toast.success('تم نسخ الرابط!');
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = window.location.href;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      toast.success('تم نسخ الرابط!');
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const openInExternalBrowser = () => {
    // Try to open in external browser using different methods
    const url = window.location.href;
    
    // Method 1: Try window.open with _system target (works on some platforms)
    const newWindow = window.open(url, '_system');
    
    // Method 2: If that didn't work, show instructions
    if (!newWindow) {
      toast.info('انسخ الرابط وافتحه في Chrome أو Safari');
    }
  };

  const skipTelegramCheck = async () => {
    // Allow user to try anyway
    if (token) {
      await validateToken(token);
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

      case 'telegram-browser':
        return (
          <div className="flex flex-col items-center justify-center p-8 space-y-6">
            <div className="p-6 rounded-full bg-blue-500/10">
              <ExternalLink className="w-20 h-20 text-blue-500" />
            </div>
            
            <div className="text-center space-y-3">
              <h2 className="text-xl font-bold">افتح الرابط في المتصفح</h2>
              <p className="text-muted-foreground text-sm">
                متصفح تيليجرام لا يدعم تسجيل البصمة.
                <br />
                انسخ الرابط وافتحه في Chrome أو Safari.
              </p>
            </div>

            <div className="bg-muted p-3 rounded-lg w-full max-w-xs">
              <p className="text-xs text-muted-foreground break-all text-center font-mono">
                {window.location.href.substring(0, 50)}...
              </p>
            </div>

            <div className="flex flex-col gap-3 w-full max-w-xs">
              <Button 
                onClick={copyLinkToClipboard}
                size="lg"
                className="w-full"
              >
                {copied ? (
                  <>
                    <CheckCircle className="w-5 h-5 me-2" />
                    تم النسخ!
                  </>
                ) : (
                  <>
                    <Copy className="w-5 h-5 me-2" />
                    نسخ الرابط
                  </>
                )}
              </Button>

              <Button 
                variant="outline"
                onClick={openInExternalBrowser}
                className="w-full"
              >
                <ExternalLink className="w-5 h-5 me-2" />
                فتح في المتصفح
              </Button>

              <Button 
                variant="ghost"
                onClick={skipTelegramCheck}
                className="w-full text-muted-foreground"
                size="sm"
              >
                المتابعة على أي حال
              </Button>
            </div>

            <div className="bg-amber-500/10 p-4 rounded-lg text-sm text-amber-700 dark:text-amber-400 max-w-sm">
              <p className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <span>
                  <strong>خطوات:</strong><br />
                  1. اضغط "نسخ الرابط"<br />
                  2. افتح Chrome أو Safari<br />
                  3. الصق الرابط في شريط العنوان
                </span>
              </p>
            </div>
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
                <ShieldCheck className="w-5 h-5 mt-0.5 flex-shrink-0 text-green-600 dark:text-green-400" />
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
            <div className="text-center space-y-3">
              <h2 className="text-2xl font-bold text-amber-600">
                تعذر تسجيل البصمة
              </h2>
              {error ? (
                <p className="text-muted-foreground">{error}</p>
              ) : (
                <p className="text-muted-foreground">
                  لا يمكن تسجيل البصمة على هذا الجهاز.
                </p>
              )}
              <div className="bg-muted/50 p-4 rounded-lg text-sm text-start space-y-2 max-w-sm mx-auto">
                <p className="font-semibold">جرب الآتي:</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>افتح الرابط في متصفح Chrome أو Safari</li>
                  <li>تأكد من تفعيل البصمة في إعدادات الجهاز</li>
                  <li>لا تفتح الرابط من داخل تطبيق تيليجرام - انسخه وافتحه في المتصفح</li>
                </ul>
              </div>
            </div>
            <div className="flex flex-col gap-2 w-full max-w-xs">
              <Button
                onClick={() => {
                  setError('');
                  setStep('register');
                }}
              >
                إعادة المحاولة
              </Button>
              <Button
                variant="outline"
                onClick={() => window.close()}
              >
                إغلاق الصفحة
              </Button>
            </div>
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
