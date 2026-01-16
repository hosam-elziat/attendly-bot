import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const Header = () => {
  const { t, language, setLanguage } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleNavigate = (path: string) => {
    setMobileMenuOpen(false);
    navigate(path);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">HR</span>
            </div>
            <span className="font-semibold text-foreground text-lg">AttendEase</span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
              className="text-muted-foreground"
            >
              {language === 'en' ? 'العربية' : 'English'}
            </Button>
            <Button variant="ghost" onClick={() => navigate('/auth')}>
              {t('auth.login')}
            </Button>
            <Button className="btn-primary-gradient" onClick={() => navigate('/auth?mode=signup')}>
              {t('auth.signup')}
            </Button>
          </nav>

          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden min-h-[44px] min-w-[44px] touch-manipulation"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-t border-border"
            >
              <nav className="flex flex-col py-4 gap-3">
                <Button
                  variant="ghost"
                  onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
                  className="justify-start min-h-[48px] touch-manipulation"
                >
                  {language === 'en' ? 'العربية' : 'English'}
                </Button>
                <Button 
                  variant="ghost" 
                  className="justify-start min-h-[48px] touch-manipulation"
                  onClick={() => handleNavigate('/auth')}
                >
                  {t('auth.login')}
                </Button>
                <Button 
                  className="btn-primary-gradient min-h-[48px] touch-manipulation"
                  onClick={() => handleNavigate('/auth?mode=signup')}
                >
                  {t('auth.signup')}
                </Button>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
};

export default Header;
