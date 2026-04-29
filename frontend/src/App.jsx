import { useAuth } from "./auth/AuthContext.jsx";
import { LoginPage } from "./pages/LoginPage.jsx";
import { DashboardPage } from "./pages/DashboardPage.jsx";
import { ProtectedRoute } from "./routes/ProtectedRoute.jsx";
import { ErrorToast } from "./ErrorToast.jsx";
import { NetworkStatus } from "./resilience/NetworkStatus.jsx";

export function App() {
  const { token } = useAuth();

  if (!token) {
    return (
      <>
        <ErrorToast />
        <NetworkStatus />
        <LoginPage />
      </>
    );
  }

  return (
    <>
      <ErrorToast />
      <NetworkStatus />
      <ProtectedRoute roles={["Admin"]}>
        <DashboardPage />
      </ProtectedRoute>
    </>
  );
}
