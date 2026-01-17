import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { motion } from "framer-motion";
import { Lock, Eye, EyeOff, CheckCircle } from "lucide-react";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { isRTL } = useLanguage();
  const navigate = useNavigate();

  useEffect(() => {
    // Check if we have a valid session from the reset link
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error(
          isRTL 
            ? "رابط إعادة التعيين غير صالح أو منتهي الصلاحية" 
            : "Invalid or expired reset link"
        );
        navigate("/forgot-password");
      }
    };
    checkSession();
  }, [navigate, isRTL]);

  const validatePassword = (password: string): string | null => {
    if (password.length < 8) {
      return isRTL 
        ? "كلمة المرور يجب أن تكون 8 أحرف على الأقل" 
        : "Password must be at least 8 characters";
    }
    if (!/[A-Z]/.test(password)) {
      return isRTL 
        ? "كلمة المرور يجب أن تحتوي على حرف كبير" 
        : "Password must contain an uppercase letter";
    }
    if (!/[a-z]/.test(password)) {
      return isRTL 
        ? "كلمة المرور يجب أن تحتوي على حرف صغير" 
        : "Password must contain a lowercase letter";
    }
    if (!/[0-9]/.test(password)) {
      return isRTL 
        ? "كلمة المرور يجب أن تحتوي على رقم" 
        : "Password must contain a number";
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const passwordError = validatePassword(password);
    if (passwordError) {
      toast.error(passwordError);
      return;
    }

    if (password !== confirmPassword) {
      toast.error(
        isRTL 
          ? "كلمات المرور غير متطابقة" 
          : "Passwords do not match"
      );
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) throw error;

      setSuccess(true);
      toast.success(
        isRTL 
          ? "تم تغيير كلمة المرور بنجاح" 
          : "Password changed successfully"
      );

      // Redirect to dashboard after 3 seconds
      setTimeout(() => {
        navigate("/dashboard");
      }, 3000);
    } catch (error: any) {
      console.error("Error resetting password:", error);
      toast.error(
        isRTL 
          ? "حدث خطأ أثناء تغيير كلمة المرور" 
          : "Error changing password"
      );
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4" dir={isRTL ? "rtl" : "ltr"}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <CardTitle className="text-2xl">
                {isRTL ? "تم بنجاح!" : "Success!"}
              </CardTitle>
              <CardDescription>
                {isRTL 
                  ? "تم تغيير كلمة المرور الخاصة بك. جاري تحويلك..."
                  : "Your password has been changed. Redirecting..."
                }
              </CardDescription>
            </CardHeader>
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
              <Lock className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">
              {isRTL ? "إعادة تعيين كلمة المرور" : "Reset Password"}
            </CardTitle>
            <CardDescription>
              {isRTL 
                ? "أدخل كلمة المرور الجديدة"
                : "Enter your new password"
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">
                  {isRTL ? "كلمة المرور الجديدة" : "New Password"}
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={isRTL ? "أدخل كلمة المرور الجديدة" : "Enter new password"}
                    disabled={loading}
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={`absolute top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground ${isRTL ? "left-3" : "right-3"}`}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">
                  {isRTL ? "تأكيد كلمة المرور" : "Confirm Password"}
                </Label>
                <Input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={isRTL ? "أعد إدخال كلمة المرور" : "Confirm new password"}
                  disabled={loading}
                  required
                />
              </div>

              <div className="text-xs text-muted-foreground space-y-1">
                <p>{isRTL ? "كلمة المرور يجب أن تحتوي على:" : "Password must contain:"}</p>
                <ul className={`list-disc ${isRTL ? "pr-4" : "pl-4"} space-y-0.5`}>
                  <li className={password.length >= 8 ? "text-green-600" : ""}>
                    {isRTL ? "8 أحرف على الأقل" : "At least 8 characters"}
                  </li>
                  <li className={/[A-Z]/.test(password) ? "text-green-600" : ""}>
                    {isRTL ? "حرف كبير واحد" : "One uppercase letter"}
                  </li>
                  <li className={/[a-z]/.test(password) ? "text-green-600" : ""}>
                    {isRTL ? "حرف صغير واحد" : "One lowercase letter"}
                  </li>
                  <li className={/[0-9]/.test(password) ? "text-green-600" : ""}>
                    {isRTL ? "رقم واحد" : "One number"}
                  </li>
                </ul>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading 
                  ? (isRTL ? "جاري الحفظ..." : "Saving...") 
                  : (isRTL ? "حفظ كلمة المرور الجديدة" : "Save New Password")
                }
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default ResetPassword;
