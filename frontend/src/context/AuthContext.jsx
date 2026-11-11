import { createContext, useContext, useEffect, useState } from "react";
import api from "../api/axios";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const [accessToken, setAccessToken] = useState(() =>
    localStorage.getItem("accessToken"),
  );

  useEffect(() => {
    if (accessToken) {
      api.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
    } else {
      delete api.defaults.headers.common.Authorization;
    }
  }, [accessToken]);

  useEffect(() => {
    const loadUser = async () => {
      if (!accessToken) {
        setLoading(false);
        return;
      }

      try {
        const response = await api.get("/auth/me");
        setUser(
          response.data.data?.user ??
            response.data.data ??
            response.data.user ??
            null,
        );
      } catch {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        setAccessToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  const saveAuthentication = (data) => {
    const token = data.accessToken || data.token;
    const refreshToken = data.refreshToken;

    if (token) {
      localStorage.setItem("accessToken", token);
      setAccessToken(token);
      api.defaults.headers.common.Authorization = `Bearer ${token}`;
    }

    if (refreshToken) {
      localStorage.setItem("refreshToken", refreshToken);
    }

    setUser(data.user ?? data.data?.user ?? null);
  };

  const login = async (credentials) => {
    const response = await api.post("/auth/login", credentials);
    const data = response.data.data ?? response.data;

    saveAuthentication(data);

    if (!data.user) {
      const currentUser = await api.get("/auth/me");
      setUser(
        currentUser.data.data?.user ??
          currentUser.data.data ??
          currentUser.data.user,
      );
    }

    return response.data;
  };

  const register = async (userData) => {
    const response = await api.post("/auth/register", userData);
    const data = response.data.data ?? response.data;

    if (data.accessToken || data.token) {
      saveAuthentication(data);
    }

    return response.data;
  };

  const logout = async () => {
    const refreshToken = localStorage.getItem("refreshToken");

    try {
      if (refreshToken) {
        await api.post("/auth/logout", { refreshToken });
      }
    } catch (error) {
      console.error("Logout request failed:", error);
    } finally {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      delete api.defaults.headers.common.Authorization;

      setAccessToken(null);
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: Boolean(user && accessToken),
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
