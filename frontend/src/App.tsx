import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { PrivateRoute } from "./components/auth/PrivateRoute";
import { ShellLayout } from "./components/layout/ShellLayout";
import Dashboard from "./pages/Dashboard";
import DemoPage from "./pages/DemoPage";
import CalendarPage from "./pages/CalendarPage";
import SymptomsPage from "./pages/SymptomsPage";
import InsightsPage from "./pages/InsightsPage";
import ExportPage from "./pages/ExportPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          element={
            <PrivateRoute>
              <ShellLayout />
            </PrivateRoute>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/symptoms" element={<SymptomsPage />} />
          <Route path="/insights" element={<InsightsPage />} />
          <Route path="/export" element={<ExportPage />} />
          <Route path="/demo" element={<DemoPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
