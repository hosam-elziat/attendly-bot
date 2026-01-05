import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Employees from "./pages/Employees";
import Attendance from "./pages/Attendance";
import Leaves from "./pages/Leaves";
import Salaries from "./pages/Salaries";
import TelegramBot from "./pages/TelegramBot";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
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
                <Route path="/dashboard/settings" element={
                  <ProtectedRoute><Settings /></ProtectedRoute>
                } />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;