import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { SignUpSchema, SignInSchema, validateWithErrors } from '@/lib/validations';

const Auth = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t, direction, language } = useLanguage();
  const { user, signIn, signUp, signInWithGoogle, loading: authLoading } = useAuth();
  const [isSignup, setIsSignup] = useState(searchParams.get('mode') === 'signup');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    companyName: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Redirect if already logged in
  useEffect(() => {
    if (user && !authLoading) {
      navigate('/dashboard');
    }
  }, [user, authLoading, navigate]);

  const validateForm = (): boolean => {
    const schema = isSignup ? SignUpSchema : SignInSchema;
    const result = validateWithErrors(schema, formData);
    
    if (result.success === false) {
      setErrors(result.errors);
      return false;
    }
    
    setErrors({});
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);
    
    try {
      if (isSignup) {
        const { error } = await signUp(
          formData.email.trim(), 
          formData.password, 
          formData.fullName.trim(), 
          formData.companyName.trim()
        );
        
        if (error) {
          if (error.message.includes('already registered')) {
            toast.error('هذا البريد الإلكتروني مسجل بالفعل. الرجاء تسجيل الدخول.');
          } else {
            toast.error(error.message);
          }
        } else {
          toast.success('تم إنشاء الحساب بنجاح! مرحباً بك في AttendEase.');
          navigate('/dashboard');
        }
      } else {
        const { error } = await signIn(formData.email.trim(), formData.password);
        
        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            toast.error('البريد الإلكتروني أو كلمة المرور غير صحيحة. حاول مرة أخرى.');
          } else {
            toast.error(error.message);
          }
        } else {
          toast.success('مرحباً بعودتك!');
          navigate('/dashboard');
        }
      }
    } catch (error) {
      toast.error('حدث خطأ غير متوقع. حاول مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        toast.error(error.message);
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء تسجيل الدخول بـ Google');
    } finally {
      setGoogleLoading(false);
    }
  };

  const BackArrow = direction === 'rtl' ? ArrowRight : ArrowLeft;

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex" dir={direction}>
      {/* Left side - Form */}
      <div className="flex-1 flex flex-col justify-center px-6 py-12 lg:px-12">
        <div className="w-full max-w-md mx-auto">
          <Link 
            to="/" 
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors"
          >
            <BackArrow className="w-4 h-4" />
            <span>{t('auth.backToHome')}</span>
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            {/* Logo */}
            <div className="flex items-center gap-2 mb-8">
              <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold">HR</span>
              </div>
              <span className="font-semibold text-foreground text-xl">AttendEase</span>
            </div>

            <h1 className="text-2xl font-bold text-foreground mb-2">
              {isSignup ? t('auth.signup') : t('auth.login')}
            </h1>
            <p className="text-muted-foreground mb-8">
              {isSignup 
                ? t('auth.createWorkspace')
                : t('auth.signInWorkspace')}
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
              {isSignup && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="fullName">{t('auth.fullName')}</Label>
                    <Input
                      id="fullName"
                      type="text"
                      placeholder="محمد أحمد"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      className={`h-12 ${errors.fullName ? 'border-destructive' : ''}`}
                      maxLength={100}
                    />
                    {errors.fullName && <p className="text-xs text-destructive">{errors.fullName}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company">{t('auth.company')}</Label>
                    <Input
                      id="company"
                      type="text"
                      placeholder="شركتك"
                      value={formData.companyName}
                      onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                      className={`h-12 ${errors.companyName ? 'border-destructive' : ''}`}
                      maxLength={100}
                    />
                    {errors.companyName && <p className="text-xs text-destructive">{errors.companyName}</p>}
                  </div>
                </>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="email">{t('auth.email')}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className={`h-12 ${errors.email ? 'border-destructive' : ''}`}
                  maxLength={255}
                />
                {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">{t('auth.password')}</Label>
                  {!isSignup && (
                    <Link to="/forgot-password" className="text-sm text-primary hover:underline">
                      {t('auth.forgot')}
                    </Link>
                  )}
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className={`h-12 ${errors.password ? 'border-destructive' : ''}`}
                  maxLength={72}
                />
                {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 btn-primary-gradient"
                disabled={loading || googleLoading}
              >
                {loading && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
                {isSignup ? t('auth.signup') : t('auth.login')}
              </Button>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    {language === 'ar' ? 'أو' : 'or'}
                  </span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full h-12"
                onClick={handleGoogleSignIn}
                disabled={loading || googleLoading}
              >
                {googleLoading ? (
                  <Loader2 className="w-4 h-4 me-2 animate-spin" />
                ) : (
                  <svg className="w-5 h-5 me-2" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                )}
                {language === 'ar' ? 'تسجيل الدخول بـ Google' : 'Continue with Google'}
              </Button>
            </form>

            <p className="text-center text-muted-foreground mt-6">
              {isSignup ? t('auth.has_account') : t('auth.no_account')}{' '}
              <button
                type="button"
                onClick={() => {
                  setIsSignup(!isSignup);
                  setErrors({});
                }}
                className="text-primary hover:underline font-medium"
              >
                {isSignup ? t('auth.login') : t('auth.signup')}
              </button>
            </p>
          </motion.div>
        </div>
      </div>

      {/* Right side - Visual */}
      <div className="hidden lg:flex flex-1 bg-primary/5 items-center justify-center p-12">
        <div className="max-w-lg text-center">
          <div className="w-24 h-24 mx-auto mb-8 rounded-2xl bg-primary/10 flex items-center justify-center">
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-xl">HR</span>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-4">
            {t('auth.manageTeam')}
          </h2>
          <p className="text-muted-foreground">
            {t('auth.manageTeamDesc')}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;
