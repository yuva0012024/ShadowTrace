import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import LocationPermissionModal from './components/LocationPermissionModal';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import Analyze from './pages/Analyze';
import Results from './pages/Results';
import MultipleResults from './pages/MultipleResults';
import History from './pages/History';
import Export from './pages/Export';
import Notifications from './pages/Notifications';
import Settings from './pages/Settings';
import Profile from './pages/Profile';
import Login from './pages/Login';
import Signup from './pages/Signup';
import AdminDashboard from './pages/AdminDashboard';
import AdminUsers from './pages/AdminUsers';

// Shell layout for all authenticated console pages
function AuthenticatedLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setSidebarOpen((prev) => !prev);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  return (
    <div className="app-container">
      <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />
      <div className="app-main">
        <Navbar onToggleSidebar={toggleSidebar} />
        <Outlet />
      </div>
      <LocationPermissionModal />
    </div>
  );
}

// Root route: First entry shows About/Landing page; authenticated users route to Dashboard
function RootRoute() {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#05070a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="health-spinner" style={{ width: '28px', height: '28px', borderWidth: '3px' }} />
      </div>
    );
  }

  if (isAuthenticated) {
    if (user?.role === 'admin') {
      return <Navigate to="/admin" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return <Landing />;
}

// Redirects already-authenticated users away from Login/Signup
function PublicAuthRoute({ children }) {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#05070a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="health-spinner" style={{ width: '28px', height: '28px', borderWidth: '3px' }} />
      </div>
    );
  }

  if (isAuthenticated) {
    if (user?.role === 'admin') {
      return <Navigate to="/admin" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Landing / About Entry Flow */}
            <Route path="/" element={<RootRoute />} />
            <Route path="/landing" element={<Landing />} />

            {/* Public Auth Routes */}
            <Route
              path="/login"
              element={
                <PublicAuthRoute>
                  <Login />
                </PublicAuthRoute>
              }
            />
            <Route
              path="/signup"
              element={
                <PublicAuthRoute>
                  <Signup />
                </PublicAuthRoute>
              }
            />

            {/* Protected Routes inside Authenticated Shell */}
            <Route
              element={
                <ProtectedRoute>
                  <AuthenticatedLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/analyze" element={<Analyze />} />
              <Route path="/results/:id" element={<Results />} />
              <Route path="/multiple-results/:id" element={<MultipleResults />} />
              <Route path="/history" element={<History />} />
              <Route path="/export" element={<Export />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/settings" element={<Settings />} />

              {/* Admin-Only Routes */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute adminOnly>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/users"
                element={
                  <ProtectedRoute adminOnly>
                    <AdminUsers />
                  </ProtectedRoute>
                }
              />
            </Route>

            {/* Fallback redirect */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
