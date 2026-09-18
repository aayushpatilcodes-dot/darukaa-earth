import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "react-hot-toast";

import { Navbar } from "./components/Navbar";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { useAuth } from "./context/useAuth";
import { Dashboard } from "./pages/Dashboard";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";

// Mapbox GL / Chart.js are heavy — split them out of the main bundle so
// login/dashboard don't pay for them on first load.
const MapView = lazy(() => import("./pages/MapView").then((m) => ({ default: m.MapView })));
const ProjectDetail = lazy(() =>
  import("./pages/ProjectDetail").then((m) => ({ default: m.ProjectDetail })),
);
const SiteDetail = lazy(() =>
  import("./pages/SiteDetail").then((m) => ({ default: m.SiteDetail })),
);

export default function App() {
  const { user } = useAuth();

  return (
    <div className="app-shell">
      <Toaster
        position="top-right"
        containerStyle={{ top: 76 }}
        toastOptions={{
          duration: 3500,
          style: {
            background: "var(--color-surface)",
            color: "var(--color-text)",
            border: "1px solid var(--color-border)",
            boxShadow: "var(--shadow-md)",
          },
          success: { iconTheme: { primary: "#1a7f4b", secondary: "#ffffff" } },
          error: { iconTheme: { primary: "#b3402d", secondary: "#ffffff" } },
        }}
      />
      {user && <Navbar />}
      <main className="app-main">
        <Suspense fallback={<div className="page-loading">Loading…</div>}>
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
        </Suspense>
      </main>
    </div>
  );
}
