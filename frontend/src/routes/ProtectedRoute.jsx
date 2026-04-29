import { useAuth } from "../auth/AuthContext.jsx";
import { LoginPage } from "../pages/LoginPage.jsx";

export function ProtectedRoute({ children, roles }) {
  const { token, user, logout } = useAuth();

  if (!token) {
    return <LoginPage />;
  }

  if (roles?.length && !roles.includes(user?.role)) {
    return (
      <main className="page">
        <section className="panel">
          <h1>Access denied</h1>
          <p>Your current role cannot access this view.</p>
          <button type="button" onClick={logout}>Sign out</button>
        </section>
      </main>
    );
  }

  return children;
}
