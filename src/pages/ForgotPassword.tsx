import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { motion } from "framer-motion";
import { Mail, ArrowLeft, CheckCircle } from "lucide-react";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { t, isRTL } = useLanguage();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast.error(isRTL ? "يرجى إدخال البريد الإلكتروني" : "Please enter your email");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      setSent(true);
      toast.success(
        isRTL 
          ? "تم إرسال رابط إعادة تعيين كلمة المرور" 
          : "Password reset link sent"
      );
    } catch (error: any) {
      console.error("Error sending reset email:", error);
      toast.error(
        isRTL 
          ? "حدث خطأ أثناء إرسال البريد الإلكتروني" 
          : "Error sending reset email"
      );
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4" dir={isRTL ? "rtl" : "ltr"}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <CardTitle className="text-2xl">
                {isRTL ? "تم إرسال البريد الإلكتروني" : "Email Sent"}
              </CardTitle>
              <CardDescription>
                {isRTL 
                  ? "تحقق من بريدك الإلكتروني للحصول على رابط إعادة تعيين كلمة المرور"
                  : "Check your email for a password reset link"
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-center text-muted-foreground mb-6">
                {isRTL 
                  ? `أرسلنا رسالة إلى ${email}`
                  : `We sent an email to ${email}`
                }
              </p>
              <Link to="/auth">
                <Button variant="outline" className="w-full">
                  <ArrowLeft className={`h-4 w-4 ${isRTL ? "ml-2" : "mr-2"}`} />
                  {isRTL ? "العودة لتسجيل الدخول" : "Back to Login"}
                </Button>
              </Link>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4" dir={isRTL ? "rtl" : "ltr"}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Mail className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">
              {isRTL ? "نسيت كلمة المرور؟" : "Forgot Password?"}
            </CardTitle>
            <CardDescription>
              {isRTL 
                ? "أدخل بريدك الإلكتروني وسنرسل لك رابط لإعادة تعيين كلمة المرور"
                : "Enter your email and we'll send you a link to reset your password"
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">
                  {isRTL ? "البريد الإلكتروني" : "Email"}
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={isRTL ? "أدخل بريدك الإلكتروني" : "Enter your email"}
                  disabled={loading}
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading 
                  ? (isRTL ? "جاري الإرسال..." : "Sending...") 
                  : (isRTL ? "إرسال رابط إعادة التعيين" : "Send Reset Link")
                }
              </Button>
            </form>

            <div className="mt-6 text-center">
              <Link 
                to="/auth" 
                className="text-sm text-primary hover:underline inline-flex items-center gap-1"
              >
                <ArrowLeft className={`h-4 w-4 ${isRTL ? "rotate-180" : ""}`} />
                {isRTL ? "العودة لتسجيل الدخول" : "Back to Login"}
              </Link>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default ForgotPassword;
