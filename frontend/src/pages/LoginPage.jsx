import { useState } from "react";
import { useAuth } from "../auth/AuthContext.jsx";

export function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await login(username, password);
    } catch (error) {
      setError(
        error.code === "DASHBOARD_ROLE_DENIED"
          ? "Only admin accounts can access MedLink Dashboard."
          : "Invalid username or password."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="page">
      <form className="panel login-form" onSubmit={handleSubmit}>
        <h1>Healthcare Triage</h1>
        <label>
          Username
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
            required
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
          />
        </label>
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </main>
  );
}
