import { ReactNode, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useViewAsCompany } from '@/contexts/ViewAsCompanyContext';
import { useSuperAdmin } from '@/contexts/SuperAdminContext';
import SuperAdminBanner from '@/components/super-admin/SuperAdminBanner';
import { Button } from '@/components/ui/button';
import { 
  LayoutDashboard, 
  Users, 
  Clock, 
  Calendar, 
  DollarSign, 
  Send, 
  Settings, 
  LogOut,
  Menu,
  X,
  Sun,
  Moon,
  CreditCard,
  History,
  UserPlus,
  Building2,
  MessageCircle,
  Gift
} from 'lucide-react';
import { cn } from '@/lib/utils';
import AISummaryButton from '@/components/ai/AISummaryButton';

interface DashboardLayoutProps {
  children: ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const { t, direction, language, setLanguage } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const { profile, signOut } = useAuth();
  const { isViewingAsCompany, viewingCompany } = useViewAsCompany();
  const { isSuperAdmin } = useSuperAdmin();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Check if Super Admin is viewing a company
  const isSuperAdminMode = isSuperAdmin && isViewingAsCompany;

  const navItems = [
    { icon: LayoutDashboard, label: t('nav.dashboard'), path: '/dashboard' },
    { icon: Users, label: t('nav.employees'), path: '/dashboard/employees' },
    { icon: Building2, label: language === 'ar' ? 'الهيكل التنظيمي' : 'Organization', path: '/dashboard/organization' },
    { icon: Clock, label: t('nav.attendance'), path: '/dashboard/attendance' },
    { icon: Calendar, label: t('nav.leaves'), path: '/dashboard/leaves' },
    { icon: DollarSign, label: t('nav.salaries'), path: '/dashboard/salaries' },
    { icon: Gift, label: language === 'ar' ? 'المكافآت' : 'Rewards', path: '/dashboard/rewards' },
    { icon: MessageCircle, label: language === 'ar' ? 'المحادثات' : 'Chats', path: '/dashboard/chats' },
    { icon: CreditCard, label: language === 'ar' ? 'الاشتراك' : 'Subscription', path: '/dashboard/subscription' },
    { icon: History, label: language === 'ar' ? 'سجل التعديلات' : 'History', path: '/dashboard/history' },
    { icon: Send, label: t('nav.telegram'), path: '/dashboard/telegram' },
    { icon: UserPlus, label: language === 'ar' ? 'طلبات الانضمام' : 'Join Requests', path: '/dashboard/join-requests' },
    { icon: Settings, label: t('nav.settings'), path: '/dashboard/settings' },
  ];

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const initials = profile?.full_name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'U';

  return (
    <div className={cn("min-h-screen bg-background", isSuperAdminMode && "pt-12")} dir={direction}>
      {/* Super Admin Banner */}
      <SuperAdminBanner />
      {/* Mobile Bottom Navigation - Enhanced */}
      <nav className={cn(
        "fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t border-border lg:hidden",
        "flex items-center justify-around py-2 px-2 safe-area-inset-bottom"
      )}>
        {navItems.slice(0, 4).map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-xl transition-all duration-200 min-w-[60px] touch-manipulation",
                isActive
                  ? "text-primary bg-primary/10 scale-105"
                  : "text-muted-foreground active:scale-95 active:bg-muted/50"
              )}
            >
              <div className={cn(
                "p-1.5 rounded-lg transition-colors",
                isActive && "bg-primary/20"
              )}>
                <item.icon className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-medium truncate max-w-[50px]">{item.label.split(' ')[0]}</span>
            </Link>
          );
        })}
        <button
          onClick={() => setSidebarOpen(true)}
          className="flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-xl text-muted-foreground min-w-[60px] touch-manipulation active:scale-95 active:bg-muted/50 transition-all duration-200"
        >
          <div className="p-1.5 rounded-lg">
            <Menu className="w-5 h-5" />
          </div>
          <span className="text-[10px] font-medium">{language === 'ar' ? 'المزيد' : 'More'}</span>
        </button>
      </nav>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 bottom-0 z-40 w-64 bg-sidebar border-r border-sidebar-border transition-transform duration-300",
          direction === 'rtl' ? 'right-0' : 'left-0',
          sidebarOpen ? 'translate-x-0' : direction === 'rtl' ? 'translate-x-full' : '-translate-x-full',
          'lg:translate-x-0'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-sidebar-border">
            <Link to="/dashboard" className="flex items-center gap-2">
              <img src="/logo.png" alt="Auto Missions Bot" className="w-9 h-9 rounded-lg" />
              <span className="font-semibold text-sidebar-foreground text-lg">Auto Missions Bot</span>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto" data-tour="sidebar-nav">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Bottom actions */}
          <div className="p-4 border-t border-sidebar-border space-y-2">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
                className="flex-1 justify-start text-sidebar-foreground"
              >
                {language === 'en' ? 'العربية' : 'English'}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className="text-sidebar-foreground"
              >
                {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              </Button>
            </div>
            <Button
              variant="ghost"
              onClick={handleLogout}
              className="w-full justify-start text-sidebar-foreground hover:text-destructive"
            >
              <LogOut className="w-5 h-5 me-3" />
              {t('nav.logout')}
            </Button>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-30 bg-foreground/20 backdrop-blur-sm lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Main content */}
      <main className={cn(
        "min-h-screen transition-all duration-300",
        direction === 'rtl' ? 'lg:mr-64' : 'lg:ml-64'
      )}>
        {/* Top bar - Enhanced for mobile */}
        <header className="sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b border-border">
          <div className="flex items-center justify-between h-14 sm:h-16 px-4 sm:px-6">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden h-10 w-10 touch-manipulation"
            >
              <Menu className="w-5 h-5" />
            </Button>
            
            <div className="flex items-center gap-3 ms-auto">
              <div className="hidden sm:block text-sm text-muted-foreground">
                {profile?.full_name}
              </div>
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-primary font-medium text-xs sm:text-sm">{initials}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Page content - Enhanced padding */}
        <div className="p-3 sm:p-6 pb-24 lg:pb-6">
          {children}
        </div>

        {/* AI Summary Button */}
        <AISummaryButton />
      </main>
    </div>
  );
};

export default DashboardLayout;
