import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { PrivateRoute } from "./components/auth/PrivateRoute";
import { useOnlineStatus } from "./hooks/useOnlineStatus";
import { OfflineIndicator } from "./components/ui/OfflineIndicator";
import { PwaInstallBanner } from "./components/ui/PwaInstallBanner";
import Dashboard from "./pages/Dashboard";
import DemoPage from "./pages/DemoPage";
import CalendarPage from "./pages/CalendarPage";
import SymptomsPage from "./pages/SymptomsPage";
import InsightsPage from "./pages/InsightsPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";

function AppLayout() {
  const { isOnline, wasOffline } = useOnlineStatus();

  return (
    <>
      <OfflineIndicator isOnline={isOnline} wasOffline={wasOffline} />
      <PwaInstallBanner />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/calendar"
          element={
            <PrivateRoute>
              <CalendarPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/symptoms"
          element={
            <PrivateRoute>
              <SymptomsPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/insights"
          element={
            <PrivateRoute>
              <InsightsPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/demo"
          element={
            <PrivateRoute>
              <DemoPage />
            </PrivateRoute>
          }
        />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  );
}

export default App;
