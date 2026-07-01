import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { PrivateRoute } from "./components/auth/PrivateRoute";
import Dashboard from "./pages/Dashboard";
import DemoPage from "./pages/DemoPage";
import CalendarPage from "./pages/CalendarPage";
import SymptomsPage from "./pages/SymptomsPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";

function App() {
  return (
    <BrowserRouter>
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
          path="/demo"
          element={
            <PrivateRoute>
              <DemoPage />
            </PrivateRoute>
          }
        />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
