import { Navigate, Route, Routes } from "react-router-dom";

import { Navbar } from "./components/Navbar";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { useAuth } from "./context/useAuth";
import { Dashboard } from "./pages/Dashboard";
import { Login } from "./pages/Login";
import { MapView } from "./pages/MapView";
import { ProjectDetail } from "./pages/ProjectDetail";
import { Register } from "./pages/Register";
import { SiteDetail } from "./pages/SiteDetail";

export default function App() {
  const { user } = useAuth();

  return (
    <div className="app-shell">
      {user && <Navbar />}
      <main className="app-main">
        <Routes>
          <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
          <Route path="/register" element={user ? <Navigate to="/" replace /> : <Register />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/map"
            element={
              <ProtectedRoute>
                <MapView />
              </ProtectedRoute>
            }
          />
          <Route
            path="/projects/:projectId"
            element={
              <ProtectedRoute>
                <ProjectDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/sites/:siteId"
            element={
              <ProtectedRoute>
                <SiteDetail />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
