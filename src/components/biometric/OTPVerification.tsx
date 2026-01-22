import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Loader2, RefreshCw, Clock, CheckCircle, XCircle, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';

interface OTPVerificationProps {
  onVerify: (otp: string) => Promise<boolean>;
  onResendOTP: () => Promise<void>;
  expiresAt?: Date;
  maxAttempts?: number;
}

const OTPVerification = ({ 
  onVerify, 
  onResendOTP, 
  expiresAt,
  maxAttempts = 3 
}: OTPVerificationProps) => {
  const [otp, setOtp] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [status, setStatus] = useState<'idle' | 'success' | 'failed'>('idle');
  const [canResend, setCanResend] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Countdown timer for OTP expiry
  useEffect(() => {
    if (!expiresAt) return;

    const updateTimer = () => {
      const now = new Date();
      const diff = Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 1000));
      setTimeLeft(diff);
      
      if (diff <= 0) {
        setCanResend(true);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    
    const timer = setTimeout(() => {
      setResendCooldown(prev => prev - 1);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleVerify = async () => {
    if (otp.length !== 6) {
      toast.error('يرجى إدخال الرمز المكون من 6 أرقام');
      return;
    }

    if (attempts >= maxAttempts) {
      toast.error('لقد تجاوزت الحد الأقصى للمحاولات');
      return;
    }

    setIsVerifying(true);
    setStatus('idle');

    try {
      const success = await onVerify(otp);
      
      if (success) {
        setStatus('success');
        toast.success('تم التحقق بنجاح!');
      } else {
        setAttempts(prev => prev + 1);
        setStatus('failed');
        setOtp('');
        toast.error(`رمز غير صحيح. المحاولات المتبقية: ${maxAttempts - attempts - 1}`);
      }
    } catch (error) {
      setAttempts(prev => prev + 1);
      setStatus('failed');
      setOtp('');
      toast.error('فشل التحقق. حاول مرة أخرى');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    
    setIsResending(true);
    try {
      await onResendOTP();
      setOtp('');
      setAttempts(0);
      setStatus('idle');
      setResendCooldown(60); // 60 seconds cooldown
      toast.success('تم إرسال رمز جديد إلى التيليجرام');
    } catch (error) {
      toast.error('فشل إرسال الرمز. حاول مرة أخرى');
    } finally {
      setIsResending(false);
    }
  };

  if (status === 'success') {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-6">
        <div className="p-4 rounded-full bg-green-500/10 animate-pulse">
          <CheckCircle className="w-16 h-16 text-green-500" />
        </div>
        <div className="text-center space-y-2">
          <h3 className="text-xl font-semibold text-green-600">تم التحقق بنجاح!</h3>
          <p className="text-muted-foreground">جارٍ تسجيل حضورك...</p>
        </div>
      </div>
    );
  }

  const isExpired = timeLeft !== null && timeLeft <= 0;
  const hasExceededAttempts = attempts >= maxAttempts;

  return (
    <div className="flex flex-col items-center justify-center p-8 space-y-6">
      <div className="p-4 rounded-full bg-primary/10">
        <MessageCircle className="w-16 h-16 text-primary" />
      </div>

      <div className="text-center space-y-2">
        <h3 className="text-xl font-semibold">رمز التحقق</h3>
        <p className="text-muted-foreground">
          تم إرسال رمز مكون من 6 أرقام إلى حسابك في التيليجرام
        </p>
      </div>

      {/* Timer */}
      {timeLeft !== null && !isExpired && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Clock className="w-4 h-4" />
          <span>ينتهي خلال {formatTime(timeLeft)}</span>
        </div>
      )}

      {isExpired && (
        <div className="flex items-center gap-2 text-destructive">
          <XCircle className="w-4 h-4" />
          <span>انتهت صلاحية الرمز</span>
        </div>
      )}

      {/* OTP Input */}
      <div className="w-full max-w-xs">
        <InputOTP
          maxLength={6}
          value={otp}
          onChange={setOtp}
          disabled={isExpired || hasExceededAttempts || isVerifying}
        >
          <InputOTPGroup className="gap-2 justify-center w-full">
            <InputOTPSlot index={0} className="w-12 h-14 text-xl" />
            <InputOTPSlot index={1} className="w-12 h-14 text-xl" />
            <InputOTPSlot index={2} className="w-12 h-14 text-xl" />
            <InputOTPSlot index={3} className="w-12 h-14 text-xl" />
            <InputOTPSlot index={4} className="w-12 h-14 text-xl" />
            <InputOTPSlot index={5} className="w-12 h-14 text-xl" />
          </InputOTPGroup>
        </InputOTP>
      </div>

      {/* Attempts counter */}
      {attempts > 0 && !hasExceededAttempts && (
        <p className="text-sm text-amber-600">
          المحاولات المتبقية: {maxAttempts - attempts}
        </p>
      )}

      {hasExceededAttempts && (
        <p className="text-sm text-destructive">
          لقد تجاوزت الحد الأقصى للمحاولات. أعد إرسال الرمز.
        </p>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <Button 
          onClick={handleVerify}
          disabled={otp.length !== 6 || isVerifying || isExpired || hasExceededAttempts}
          className="w-full"
          size="lg"
        >
          {isVerifying ? (
            <>
              <Loader2 className="w-5 h-5 me-2 animate-spin" />
              جارٍ التحقق...
            </>
          ) : (
            'تأكيد'
          )}
        </Button>

        <Button
          variant="outline"
          onClick={handleResend}
          disabled={isResending || resendCooldown > 0}
          className="w-full"
        >
          {isResending ? (
            <Loader2 className="w-4 h-4 me-2 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4 me-2" />
          )}
          {resendCooldown > 0 
            ? `إعادة الإرسال (${resendCooldown}ث)`
            : 'إعادة إرسال الرمز'
          }
        </Button>
      </div>
    </div>
  );
};

export default OTPVerification;
