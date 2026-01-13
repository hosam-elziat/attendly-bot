import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { SuperAdminProvider } from "@/contexts/SuperAdminContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import SuperAdminProtectedRoute from "@/components/super-admin/SuperAdminProtectedRoute";

import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Employees from "./pages/Employees";
import EmployeeDetails from "./pages/EmployeeDetails";
import Attendance from "./pages/Attendance";
import Leaves from "./pages/Leaves";
import Salaries from "./pages/Salaries";
import TelegramBot from "./pages/TelegramBot";
import JoinRequests from "./pages/JoinRequests";
import Settings from "./pages/Settings";
import Subscription from "./pages/Subscription";
import History from "./pages/History";
import Organization from "./pages/Organization";
import NotFound from "./pages/NotFound";

// Super Admin Pages
import SuperAdminAuth from "./pages/super-admin/SuperAdminAuth";
import SuperAdminDashboard from "./pages/super-admin/SuperAdminDashboard";
import SuperAdminCompanies from "./pages/super-admin/SuperAdminCompanies";
import SuperAdminEmployees from "./pages/super-admin/SuperAdminEmployees";
import SuperAdminSubscriptions from "./pages/super-admin/SuperAdminSubscriptions";
import SuperAdminTeam from "./pages/super-admin/SuperAdminTeam";
import SuperAdminPlans from "./pages/super-admin/SuperAdminPlans";
import SuperAdminTelegramBots from "./pages/super-admin/SuperAdminTelegramBots";

const queryClient = new QueryClient();

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
                
                <Routes>
                  <Route path="/" element={<Landing />} />
                  <Route path="/auth" element={<Auth />} />
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
                  
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
            </TooltipProvider>
          </SuperAdminProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;