import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import AppLayout from '@/components/layout/AppLayout';
import LoginPage from '@/pages/auth/LoginPage';
import ReceptionistDashboard from '@/pages/receptionist/Dashboard';
import CheckInPage from '@/pages/receptionist/CheckInPage';
import CouriersPage from '@/pages/receptionist/CouriersPage';
import CheckOutsPage from '@/pages/receptionist/CheckOutsPage';
import InternalCourierTrackingPage from '@/pages/receptionist/InternalCourierTrackingPage';
import OfficialDashboard from '@/pages/official/OfficialDashboard';
import NotificationsPage from '@/pages/official/NotificationsPage';
import ApprovalsPage from '@/pages/official/ApprovalsPage';
import UserManagementPage from '@/pages/admin/UserManagementPage';
import ReportsPage from '@/pages/receptionist/ReportsPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 1000 * 30, retry: 1 },
  },
});

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) {
  const { session, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-14 h-10 rounded-xl flex items-center justify-center mx-auto mb-3" style={{background: "linear-gradient(145deg,#CC0000,#A80000)"}}>
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /><img src="/scorpion-logo.svg" alt="" className="sr-only" />
          </div>
          <p className="text-muted-foreground text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) return <Navigate to="/login" replace />;

  if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
    if (profile.role === 'official') return <Navigate to="/official" replace />;
    return <Navigate to="/receptionist" replace />;
  }

  return <AppLayout>{children}</AppLayout>;
}

function RootRedirect() {
  const { session, profile, loading } = useAuth();
  if (loading) return null;
  if (!session) return <Navigate to="/login" replace />;
  if (profile?.role === 'official') return <Navigate to="/official" replace />;
  return <Navigate to="/receptionist" replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<RootRedirect />} />

      {/* Receptionist routes */}
      <Route path="/receptionist" element={
        <ProtectedRoute allowedRoles={['receptionist', 'admin']}>
          <ReceptionistDashboard />
        </ProtectedRoute>
      } />
      <Route path="/receptionist/checkin" element={
        <ProtectedRoute allowedRoles={['receptionist', 'admin']}>
          <CheckInPage />
        </ProtectedRoute>
      } />
      <Route path="/receptionist/couriers" element={
        <ProtectedRoute allowedRoles={['receptionist', 'admin']}>
          <CouriersPage />
        </ProtectedRoute>
      } />
      <Route path="/receptionist/couriers/new" element={
        <ProtectedRoute allowedRoles={['receptionist', 'admin']}>
          <CouriersPage />
        </ProtectedRoute>
      } />
      <Route path="/receptionist/outward-courier-entry" element={
        <ProtectedRoute allowedRoles={['receptionist', 'admin']}>
          <InternalCourierTrackingPage />
        </ProtectedRoute>
      } />
      <Route path="/receptionist/internal-courier" element={<Navigate to="/receptionist/outward-courier-entry" replace />} />
      <Route path="/receptionist/checkouts" element={
        <ProtectedRoute allowedRoles={['receptionist', 'admin']}>
          <CheckOutsPage />
        </ProtectedRoute>
      } />
      <Route path="/receptionist/reports" element={
        <ProtectedRoute allowedRoles={['receptionist', 'admin']}>
          <ReportsPage />
        </ProtectedRoute>
      } />

      {/* Company official routes */}
      <Route path="/official" element={
        <ProtectedRoute allowedRoles={['official', 'admin']}>
          <OfficialDashboard />
        </ProtectedRoute>
      } />
      <Route path="/official/notifications" element={
        <ProtectedRoute allowedRoles={['official', 'admin']}>
          <NotificationsPage />
        </ProtectedRoute>
      } />
      <Route path="/official/approvals" element={
        <ProtectedRoute allowedRoles={['official', 'admin']}>
          <ApprovalsPage />
        </ProtectedRoute>
      } />

      {/* Admin routes */}
      <Route path="/admin/users" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <UserManagementPage />
        </ProtectedRoute>
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
          <Toaster position="top-right" richColors closeButton />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
