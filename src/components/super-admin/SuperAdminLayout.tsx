import { ReactNode, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useSuperAdmin } from '@/contexts/SuperAdminContext';
import { Button } from '@/components/ui/button';
import { 
  LayoutDashboard, 
  Building2, 
  Users, 
  CreditCard, 
  UserCog,
  LogOut,
  Menu,
  Shield
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SuperAdminLayoutProps {
  children: ReactNode;
}

const SuperAdminLayout = ({ children }: SuperAdminLayoutProps) => {
  const { teamMember, signOut } = useSuperAdmin();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = [
    { icon: LayoutDashboard, label: 'لوحة التحكم', path: '/super-admin/dashboard' },
    { icon: Building2, label: 'الشركات', path: '/super-admin/companies' },
    { icon: Users, label: 'الموظفين', path: '/super-admin/employees' },
    { icon: CreditCard, label: 'الاشتراكات', path: '/super-admin/subscriptions' },
    { icon: CreditCard, label: 'الباقات والأسعار', path: '/super-admin/plans' },
    { icon: UserCog, label: 'فريق العمل', path: '/super-admin/team' },
    { icon: LayoutDashboard, label: 'بوتات التيليجرام', path: '/super-admin/telegram-bots' },
  ];

  const handleLogout = async () => {
    await signOut();
    navigate('/super-admin');
  };

  const initials = teamMember?.full_name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'SA';

  const getRoleName = (role: string) => {
    switch (role) {
      case 'super_admin': return 'مدير النظام';
      case 'manager': return 'مدير';
      case 'support': return 'دعم فني';
      case 'viewer': return 'مشاهد';
      default: return role;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950" dir="rtl">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 bottom-0 right-0 z-40 w-64 bg-slate-900 border-l border-slate-800 transition-transform duration-300",
          sidebarOpen ? 'translate-x-0' : 'translate-x-full',
          'lg:translate-x-0'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-slate-800">
            <Link to="/super-admin/dashboard" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                <Shield className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <span className="font-bold text-white text-lg block">Super Admin</span>
                <span className="text-xs text-slate-400">{getRoleName(teamMember?.role || '')}</span>
              </div>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
                    isActive
                      ? "bg-primary text-primary-foreground font-medium"
                      : "text-slate-300 hover:bg-slate-800"
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Bottom actions */}
          <div className="p-4 border-t border-slate-800">
            <div className="flex items-center gap-3 mb-4 p-3 rounded-xl bg-slate-800/50">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-primary font-medium">{initials}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium truncate">{teamMember?.full_name}</p>
                <p className="text-slate-400 text-xs truncate">{teamMember?.email}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              onClick={handleLogout}
              className="w-full justify-start text-slate-300 hover:text-red-400 hover:bg-red-500/10"
            >
              <LogOut className="w-5 h-5 me-3" />
              تسجيل الخروج
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
            className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Main content */}
      <main className="min-h-screen lg:mr-64 transition-all duration-300">
        {/* Top bar */}
        <header className="sticky top-0 z-20 bg-slate-950/80 backdrop-blur-md border-b border-slate-800">
          <div className="flex items-center justify-between h-16 px-6">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-white"
            >
              <Menu className="w-5 h-5" />
            </Button>
            
            <div className="flex items-center gap-4 ms-auto">
              <span className="text-slate-400 text-sm">
                مرحباً، {teamMember?.full_name}
              </span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
};

export default SuperAdminLayout;
