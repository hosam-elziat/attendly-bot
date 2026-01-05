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
  const { t, direction } = useLanguage();
  const { user, signIn, signUp, loading: authLoading } = useAuth();
  const [isSignup, setIsSignup] = useState(searchParams.get('mode') === 'signup');
  const [loading, setLoading] = useState(false);
  
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
            toast.error('This email is already registered. Please sign in instead.');
          } else {
            toast.error(error.message);
          }
        } else {
          toast.success('Account created successfully! Welcome to AttendEase.');
          navigate('/dashboard');
        }
      } else {
        const { error } = await signIn(formData.email.trim(), formData.password);
        
        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            toast.error('Invalid email or password. Please try again.');
          } else {
            toast.error(error.message);
          }
        } else {
          toast.success('Welcome back!');
          navigate('/dashboard');
        }
      }
    } catch (error) {
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
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
            <span>Back to home</span>
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
                ? 'Create your company workspace' 
                : 'Sign in to your workspace'}
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
              {isSignup && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      type="text"
                      placeholder="John Doe"
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
                      placeholder="Your Company"
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
                disabled={loading}
              >
                {loading && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
                {isSignup ? t('auth.signup') : t('auth.login')}
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
            Manage your team with ease
          </h2>
          <p className="text-muted-foreground">
            Track attendance, approve leaves, and calculate salaries — all in one simple dashboard. 
            Your team uses Telegram, no apps to install.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;
