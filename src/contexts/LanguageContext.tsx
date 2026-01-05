import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Language = 'en' | 'ar';
type Direction = 'ltr' | 'rtl';

interface LanguageContextType {
  language: Language;
  direction: Direction;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    // Navigation
    'nav.dashboard': 'Dashboard',
    'nav.employees': 'Employees',
    'nav.attendance': 'Attendance',
    'nav.leaves': 'Leave Requests',
    'nav.salaries': 'Salaries',
    'nav.telegram': 'Telegram Bot',
    'nav.settings': 'Settings',
    'nav.logout': 'Logout',
    
    // Landing
    'landing.hero.title': 'Simple HR & Attendance Management',
    'landing.hero.subtitle': 'Track employee attendance, manage leaves, and calculate salaries — all in one place. With Telegram bot integration.',
    'landing.hero.cta': 'Start Free Trial',
    'landing.hero.login': 'Sign In',
    'landing.features.title': 'Everything you need',
    'landing.features.subtitle': 'A complete solution for small and medium businesses',
    
    // Features
    'feature.attendance': 'Attendance Tracking',
    'feature.attendance.desc': 'Employees check in/out via Telegram. No apps to install.',
    'feature.leaves': 'Leave Management',
    'feature.leaves.desc': 'Request and approve leaves with one click.',
    'feature.salaries': 'Salary Calculator',
    'feature.salaries.desc': 'Automatic calculations based on attendance and bonuses.',
    'feature.telegram': 'Telegram Bot',
    'feature.telegram.desc': 'Your team uses Telegram. No training needed.',
    
    // Auth
    'auth.login': 'Sign In',
    'auth.signup': 'Create Account',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.company': 'Company Name',
    'auth.forgot': 'Forgot password?',
    'auth.no_account': "Don't have an account?",
    'auth.has_account': 'Already have an account?',
    
    // Dashboard
    'dashboard.welcome': 'Welcome back',
    'dashboard.today': "Today's Overview",
    'dashboard.present': 'Present',
    'dashboard.absent': 'Absent',
    'dashboard.on_leave': 'On Leave',
    'dashboard.pending': 'Pending Requests',
    
    // Employees
    'employees.title': 'Employees',
    'employees.add': 'Add Employee',
    'employees.search': 'Search employees...',
    'employees.role': 'Role',
    'employees.department': 'Department',
    'employees.status': 'Status',
    
    // Settings
    'settings.title': 'Settings',
    'settings.language': 'Language',
    'settings.theme': 'Theme',
    'settings.theme.light': 'Light',
    'settings.theme.dark': 'Dark',
    
    // Common
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.edit': 'Edit',
    'common.delete': 'Delete',
    'common.active': 'Active',
    'common.inactive': 'Inactive',
  },
  ar: {
    // Navigation
    'nav.dashboard': 'لوحة التحكم',
    'nav.employees': 'الموظفين',
    'nav.attendance': 'الحضور',
    'nav.leaves': 'طلبات الإجازة',
    'nav.salaries': 'الرواتب',
    'nav.telegram': 'بوت تيليجرام',
    'nav.settings': 'الإعدادات',
    'nav.logout': 'تسجيل الخروج',
    
    // Landing
    'landing.hero.title': 'إدارة الموارد البشرية والحضور بسهولة',
    'landing.hero.subtitle': 'تتبع حضور الموظفين، وإدارة الإجازات، وحساب الرواتب — كل ذلك في مكان واحد. مع تكامل بوت تيليجرام.',
    'landing.hero.cta': 'ابدأ تجربة مجانية',
    'landing.hero.login': 'تسجيل الدخول',
    'landing.features.title': 'كل ما تحتاجه',
    'landing.features.subtitle': 'حل متكامل للشركات الصغيرة والمتوسطة',
    
    // Features
    'feature.attendance': 'تتبع الحضور',
    'feature.attendance.desc': 'يسجل الموظفون حضورهم عبر تيليجرام. لا حاجة لتثبيت تطبيقات.',
    'feature.leaves': 'إدارة الإجازات',
    'feature.leaves.desc': 'طلب والموافقة على الإجازات بنقرة واحدة.',
    'feature.salaries': 'حاسبة الرواتب',
    'feature.salaries.desc': 'حسابات تلقائية بناءً على الحضور والمكافآت.',
    'feature.telegram': 'بوت تيليجرام',
    'feature.telegram.desc': 'فريقك يستخدم تيليجرام. لا حاجة للتدريب.',
    
    // Auth
    'auth.login': 'تسجيل الدخول',
    'auth.signup': 'إنشاء حساب',
    'auth.email': 'البريد الإلكتروني',
    'auth.password': 'كلمة المرور',
    'auth.company': 'اسم الشركة',
    'auth.forgot': 'نسيت كلمة المرور؟',
    'auth.no_account': 'ليس لديك حساب؟',
    'auth.has_account': 'لديك حساب بالفعل؟',
    
    // Dashboard
    'dashboard.welcome': 'مرحباً بعودتك',
    'dashboard.today': 'نظرة عامة على اليوم',
    'dashboard.present': 'حاضر',
    'dashboard.absent': 'غائب',
    'dashboard.on_leave': 'في إجازة',
    'dashboard.pending': 'طلبات معلقة',
    
    // Employees
    'employees.title': 'الموظفين',
    'employees.add': 'إضافة موظف',
    'employees.search': 'البحث عن موظفين...',
    'employees.role': 'الدور',
    'employees.department': 'القسم',
    'employees.status': 'الحالة',
    
    // Settings
    'settings.title': 'الإعدادات',
    'settings.language': 'اللغة',
    'settings.theme': 'المظهر',
    'settings.theme.light': 'فاتح',
    'settings.theme.dark': 'داكن',
    
    // Common
    'common.save': 'حفظ',
    'common.cancel': 'إلغاء',
    'common.edit': 'تعديل',
    'common.delete': 'حذف',
    'common.active': 'نشط',
    'common.inactive': 'غير نشط',
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>('en');
  const direction: Direction = language === 'ar' ? 'rtl' : 'ltr';

  useEffect(() => {
    const saved = localStorage.getItem('language') as Language;
    if (saved && (saved === 'en' || saved === 'ar')) {
      setLanguageState(saved);
    }
  }, []);

  useEffect(() => {
    document.documentElement.dir = direction;
    document.documentElement.lang = language;
    localStorage.setItem('language', language);
  }, [language, direction]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, direction, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
