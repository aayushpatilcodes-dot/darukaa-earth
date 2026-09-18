import { useEffect, useState, type ReactNode } from "react";

import { fetchCurrentUser, login as apiLogin, register as apiRegister } from "../api/endpoints";
import { clearToken, getToken, setToken, UNAUTHORIZED_EVENT } from "../api/client";
import type { User } from "../types";
import { AuthContext } from "./authContextValue";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setIsLoading(false);
      return;
    }
    fetchCurrentUser()
      .then(setUser)
      .catch(() => clearToken())
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    function handleUnauthorized() {
      setUser(null);
    }
    window.addEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
  }, []);

  async function login(email: string, password: string) {
    const response = await apiLogin(email, password);
    setToken(response.access_token);
    setUser(response.user);
  }

  async function register(email: string, fullName: string, password: string) {
    const response = await apiRegister(email, fullName, password);
    setToken(response.access_token);
    setUser(response.user);
  }

  function logout() {
    clearToken();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
