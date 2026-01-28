import { lazy, Suspense, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { SuperAdminProvider } from "@/contexts/SuperAdminContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import SuperAdminProtectedRoute from "@/components/super-admin/SuperAdminProtectedRoute";
import { Loader2 } from "lucide-react";

// Component to cleanup body locks on route change (safety net for dialogs)
const RouteCleanup = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  
  useEffect(() => {
    // Clean up any lingering body locks when navigating
    document.body.style.pointerEvents = '';
    document.body.style.overflow = '';
    document.body.removeAttribute('data-scroll-locked');
  }, [location.pathname]);
  
  return <>{children}</>;
};

// Lazy loaded pages for better performance
const Landing = lazy(() => import("./pages/Landing"));
const Auth = lazy(() => import("./pages/Auth"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Employees = lazy(() => import("./pages/Employees"));
const EmployeeDetails = lazy(() => import("./pages/EmployeeDetails"));
const Attendance = lazy(() => import("./pages/Attendance"));
const Leaves = lazy(() => import("./pages/Leaves"));
const Salaries = lazy(() => import("./pages/Salaries"));
const TelegramBot = lazy(() => import("./pages/TelegramBot"));
const JoinRequests = lazy(() => import("./pages/JoinRequests"));
const Settings = lazy(() => import("./pages/Settings"));
const Subscription = lazy(() => import("./pages/Subscription"));
const History = lazy(() => import("./pages/History"));
const Organization = lazy(() => import("./pages/Organization"));
const Chats = lazy(() => import("./pages/Chats"));
const NotFound = lazy(() => import("./pages/NotFound"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const VerifyAttendance = lazy(() => import("./pages/VerifyAttendance"));
const RegisterBiometric = lazy(() => import("./pages/RegisterBiometric"));
const Rewards = lazy(() => import("./pages/Rewards"));

// Super Admin Pages - Lazy loaded
const SuperAdminAuth = lazy(() => import("./pages/super-admin/SuperAdminAuth"));
const SuperAdminDashboard = lazy(() => import("./pages/super-admin/SuperAdminDashboard"));
const SuperAdminCompanies = lazy(() => import("./pages/super-admin/SuperAdminCompanies"));
const SuperAdminEmployees = lazy(() => import("./pages/super-admin/SuperAdminEmployees"));
const SuperAdminSubscriptions = lazy(() => import("./pages/super-admin/SuperAdminSubscriptions"));
const SuperAdminTeam = lazy(() => import("./pages/super-admin/SuperAdminTeam"));
const SuperAdminPlans = lazy(() => import("./pages/super-admin/SuperAdminPlans"));
const SuperAdminTelegramBots = lazy(() => import("./pages/super-admin/SuperAdminTelegramBots"));
const SuperAdminBackups = lazy(() => import("./pages/super-admin/SuperAdminBackups"));
const SuperAdminPhotoRequests = lazy(() => import("./pages/super-admin/SuperAdminPhotoRequests"));

const queryClient = new QueryClient();

// Loading fallback component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="flex flex-col items-center gap-4">
      <Loader2 className="w-10 h-10 animate-spin text-primary" />
      <p className="text-muted-foreground text-sm">Loading...</p>
    </div>
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <SuperAdminProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <RouteCleanup>
                  <Suspense fallback={<PageLoader />}>
                    <Routes>
                      <Route path="/" element={<Landing />} />
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/forgot-password" element={<ForgotPassword />} />
                    <Route path="/reset-password" element={<ResetPassword />} />
                    <Route path="/verify-attendance" element={<VerifyAttendance />} />
                    <Route path="/register-biometric" element={<RegisterBiometric />} />
                    <Route path="/dashboard" element={
                      <ProtectedRoute><Dashboard /></ProtectedRoute>
                    } />
                    <Route path="/dashboard/employees" element={
                      <ProtectedRoute><Employees /></ProtectedRoute>
                    } />
                    <Route path="/dashboard/employees/:id" element={
                      <ProtectedRoute><EmployeeDetails /></ProtectedRoute>
                    } />
                    <Route path="/dashboard/attendance" element={
                      <ProtectedRoute><Attendance /></ProtectedRoute>
                    } />
                    <Route path="/dashboard/leaves" element={
                      <ProtectedRoute><Leaves /></ProtectedRoute>
                    } />
                    <Route path="/dashboard/salaries" element={
                      <ProtectedRoute><Salaries /></ProtectedRoute>
                    } />
                    <Route path="/dashboard/telegram" element={
                      <ProtectedRoute><TelegramBot /></ProtectedRoute>
                    } />
                    <Route path="/dashboard/join-requests" element={
                      <ProtectedRoute><JoinRequests /></ProtectedRoute>
                    } />
                    <Route path="/dashboard/settings" element={
                      <ProtectedRoute><Settings /></ProtectedRoute>
                    } />
                    <Route path="/dashboard/subscription" element={
                      <ProtectedRoute><Subscription /></ProtectedRoute>
                    } />
                    <Route path="/dashboard/history" element={
                      <ProtectedRoute><History /></ProtectedRoute>
                    } />
                    <Route path="/dashboard/organization" element={
                      <ProtectedRoute><Organization /></ProtectedRoute>
                    } />
                    <Route path="/dashboard/chats" element={
                      <ProtectedRoute><Chats /></ProtectedRoute>
                    } />
                    <Route path="/dashboard/rewards" element={
                      <ProtectedRoute><Rewards /></ProtectedRoute>
                    } />
                    
                    {/* Super Admin Routes */}
                    <Route path="/super-admin" element={<SuperAdminAuth />} />
                    <Route path="/super-admin/dashboard" element={
                      <SuperAdminProtectedRoute><SuperAdminDashboard /></SuperAdminProtectedRoute>
                    } />
                    <Route path="/super-admin/companies" element={
                      <SuperAdminProtectedRoute><SuperAdminCompanies /></SuperAdminProtectedRoute>
                    } />
                    <Route path="/super-admin/employees" element={
                      <SuperAdminProtectedRoute><SuperAdminEmployees /></SuperAdminProtectedRoute>
                    } />
                    <Route path="/super-admin/subscriptions" element={
                      <SuperAdminProtectedRoute><SuperAdminSubscriptions /></SuperAdminProtectedRoute>
                    } />
                    <Route path="/super-admin/team" element={
                      <SuperAdminProtectedRoute><SuperAdminTeam /></SuperAdminProtectedRoute>
                    } />
                    <Route path="/super-admin/plans" element={
                      <SuperAdminProtectedRoute><SuperAdminPlans /></SuperAdminProtectedRoute>
                    } />
                    <Route path="/super-admin/telegram-bots" element={
                      <SuperAdminProtectedRoute><SuperAdminTelegramBots /></SuperAdminProtectedRoute>
                    } />
                    <Route path="/super-admin/backups" element={
                      <SuperAdminProtectedRoute><SuperAdminBackups /></SuperAdminProtectedRoute>
                    } />
                    <Route path="/super-admin/photo-requests" element={
                      <SuperAdminProtectedRoute><SuperAdminPhotoRequests /></SuperAdminProtectedRoute>
                    } />
                    
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
                </RouteCleanup>
              </BrowserRouter>
            </TooltipProvider>
          </SuperAdminProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
