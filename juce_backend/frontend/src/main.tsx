import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import QueryProvider from '@/providers/QueryProvider';
import AuthProvider, { isAuthEnabled } from '@/providers/AuthProvider';
import WebSocketAuthProvider from '@/providers/WebSocketAuthProvider';
import CopilotKitProvider from '@/providers/CopilotKitProvider';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AuthPage from '@/pages/AuthPage';
import DAIDDashboard from '@/pages/DAIDDashboard';
import TelemetryDashboard from '@/pages/TelemetryDashboard';
import AdminLayout from '@/pages/admin/AdminLayout';
import AdminRoute from '@/components/auth/AdminRoute';
import TransformationTest from '@/pages/TransformationTest';
import HITLTest from '@/pages/HITLTest';
import FlowPage from '@/pages/FlowPage';
import SimpleTest from '@/pages/SimpleTest';
import ComponentLibraryPage from '@/pages/ComponentLibraryPage';
import { SignedIn, SignedOut } from '@clerk/clerk-react';
import { initPluginReconciler } from './services/pluginReconciler.ts';

initPluginReconciler();

const authRoutes = (
  <>
    <Route path="/sign-in" element={<AuthPage mode="sign-in" />} />
    <Route path="/sign-up" element={<AuthPage mode="sign-up" />} />
  </>
);

const protectedRoutes = (
  <>
    <Route path="/simple-test" element={<SimpleTest />} />
    <Route path="/flow-test" element={<FlowPage />} />
    <Route path="/" element={<App />} />
    <Route path="/daw" element={<App />} />
    <Route path="/library" element={<ComponentLibraryPage />} />
    <Route path="/test" element={<TransformationTest />} />
    <Route path="/hitl" element={<HITLTest />} />
    <Route path="/flow" element={<FlowPage />} />
    <Route path="/telemetry" element={<TelemetryDashboard />} />
    <Route
      path="/admin"
      element={(
        <AdminRoute>
          <AdminLayout />
        </AdminRoute>
      )}
    >
      <Route index element={<div className="text-sm text-gray-400">Select an admin section</div>} />
      <Route path="daid" element={<DAIDDashboard />} />
    </Route>
  </>
);

const ProtectedRoutes = () => (
  <Routes>
    {protectedRoutes}
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

const UnauthenticatedRoutes = () => (
  <Routes>
    {authRoutes}
    <Route path="*" element={<Navigate to="/sign-in" replace />} />
  </Routes>
);

const AllRoutes = () => (
  <Routes>
    {authRoutes}
    {protectedRoutes}
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}

createRoot(rootElement).render(
  <StrictMode>
    <AuthProvider>
      <QueryProvider>
        <WebSocketAuthProvider>
          <CopilotKitProvider>
            <BrowserRouter>
              {isAuthEnabled ? (
                <>
                  <SignedIn>
                    <ProtectedRoutes />
                  </SignedIn>
                  <SignedOut>
                    <UnauthenticatedRoutes />
                  </SignedOut>
                </>
              ) : (
                <AllRoutes />
              )}
            </BrowserRouter>
          </CopilotKitProvider>
        </WebSocketAuthProvider>
      </QueryProvider>
    </AuthProvider>
  </StrictMode>
);
