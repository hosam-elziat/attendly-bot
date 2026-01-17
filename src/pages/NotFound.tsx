import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft, Search } from "lucide-react";

const NotFound = () => {
  const location = useLocation();
  const { language, direction } = useLanguage();
  const isRTL = direction === 'rtl';

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4" dir={direction}>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center max-w-md"
      >
        {/* Animated 404 */}
        <motion.div 
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="mb-8"
        >
          <div className="text-8xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            404
          </div>
        </motion.div>

        {/* Error icon */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="w-20 h-20 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center"
        >
          <Search className="w-10 h-10 text-muted-foreground" />
        </motion.div>

        {/* Message */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <h1 className="text-2xl font-bold text-foreground mb-3">
            {isRTL ? "الصفحة غير موجودة" : "Page Not Found"}
          </h1>
          <p className="text-muted-foreground mb-8">
            {isRTL 
              ? "عذراً، الصفحة التي تبحث عنها غير موجودة أو تم نقلها."
              : "Sorry, the page you're looking for doesn't exist or has been moved."
            }
          </p>
        </motion.div>

        {/* Action buttons */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="flex flex-col sm:flex-row gap-3 justify-center"
        >
          <Button asChild>
            <Link to="/">
              <Home className={`w-4 h-4 ${isRTL ? "ml-2" : "mr-2"}`} />
              {isRTL ? "الصفحة الرئيسية" : "Go Home"}
            </Link>
          </Button>
          <Button variant="outline" onClick={() => window.history.back()}>
            <ArrowLeft className={`w-4 h-4 ${isRTL ? "ml-2 rotate-180" : "mr-2"}`} />
            {isRTL ? "العودة للخلف" : "Go Back"}
          </Button>
        </motion.div>

        {/* Quick links */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-12 pt-8 border-t border-border"
        >
          <p className="text-sm text-muted-foreground mb-4">
            {isRTL ? "روابط مفيدة:" : "Helpful links:"}
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/dashboard" className="text-sm text-primary hover:underline">
              {isRTL ? "لوحة التحكم" : "Dashboard"}
            </Link>
            <Link to="/dashboard/employees" className="text-sm text-primary hover:underline">
              {isRTL ? "الموظفين" : "Employees"}
            </Link>
            <Link to="/dashboard/attendance" className="text-sm text-primary hover:underline">
              {isRTL ? "الحضور" : "Attendance"}
            </Link>
            <Link to="/auth" className="text-sm text-primary hover:underline">
              {isRTL ? "تسجيل الدخول" : "Sign In"}
            </Link>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default NotFound;
