import { createContext, useContext, useMemo, useState } from "react";
import { jwtDecode } from "jwt-decode";
import { httpClient } from "../api/httpClient.js";

const AuthContext = createContext(null);
const dashboardRoles = ["Admin"];

function canAccessDashboard(user) {
  return dashboardRoles.includes(user?.role);
}

function decodeUser(token) {
  if (!token) {
    return null;
  }

  try {
    const decoded = jwtDecode(token);
    const expiresAt = decoded.exp ? decoded.exp * 1000 : null;

    if (expiresAt && expiresAt <= Date.now()) {
      localStorage.removeItem("token");
      return null;
    }

    return {
      id: decoded.sub,
      username:
        decoded.name ??
        decoded["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"],
      role:
        decoded.role ??
        decoded["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"]
    };
  } catch {
    localStorage.removeItem("token");
    return null;
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => {
    const storedToken = localStorage.getItem("token");
    const storedUser = decodeUser(storedToken);

    if (!canAccessDashboard(storedUser)) {
      localStorage.removeItem("token");
      return null;
    }

    return storedToken;
  });
  const [user, setUser] = useState(() => decodeUser(localStorage.getItem("token")));

  async function login(username, password) {
    const response = await httpClient.post("/auth/login", { username, password });
    const nextToken = response.data.token;
    const nextUser = decodeUser(nextToken);

    if (!canAccessDashboard(nextUser)) {
      localStorage.removeItem("token");
      setToken(null);
      setUser(null);
      const error = new Error("Only admin accounts can access the React dashboard.");
      error.code = "DASHBOARD_ROLE_DENIED";
      throw error;
    }

    localStorage.setItem("token", nextToken);
    setToken(nextToken);
    setUser(nextUser);
  }

  function logout() {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
  }

  const value = useMemo(
    () => ({
      token,
      user,
      login,
      logout
    }),
    [token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider.");
  }

  return context;
}
