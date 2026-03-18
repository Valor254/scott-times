import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import {
  authApi,
  type AuthUser,
  type LoginPayload,
  type RegisterPayload,
} from "@/lib/api";

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isLoggedIn: boolean;
  isAdmin: boolean;
  isParent: boolean;
  login: (data: LoginPayload) => Promise<AuthUser>;
  register: (data: RegisterPayload) => Promise<AuthUser>;
  logout: () => void;
  setDemoUser: (user: AuthUser | null) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const TOKEN_KEY = "scott_times_token";
const USER_KEY = "scott_times_user";

function decodeJwt(token: string): any | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;

    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");

    const json = decodeURIComponent(
      atob(padded)
        .split("")
        .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
        .join("")
    );

    return JSON.parse(json);
  } catch {
    return null;
  }
}

function normalizeUser(raw: AuthUser): AuthUser {
  return {
    ...raw,
    fullName: raw.fullName || raw.full_name || "User",
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const cachedUser = localStorage.getItem(USER_KEY);
    const token = localStorage.getItem(TOKEN_KEY);

    if (cachedUser) {
      try {
        setUser(JSON.parse(cachedUser));
      } catch {
        localStorage.removeItem(USER_KEY);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (!token) {
      setIsLoading(false);
      return;
    }

    const payload = decodeJwt(token);

    if (!payload?.id || !payload?.email || !payload?.role) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      setIsLoading(false);
      return;
    }

    const restored: AuthUser = {
      id: payload.id,
      email: payload.email,
      role: payload.role,
      fullName: payload.full_name || payload.fullName || "User",
    };

    localStorage.setItem(USER_KEY, JSON.stringify(restored));
    setUser(restored);
    setIsLoading(false);
  }, []);

  const login = useCallback(async (data: LoginPayload) => {
    const res = await authApi.login(data);

    localStorage.setItem(TOKEN_KEY, res.token);

    const normalized = normalizeUser(res.user);
    localStorage.setItem(USER_KEY, JSON.stringify(normalized));
    setUser(normalized);

    return normalized;
  }, []);

  const register = useCallback(async (data: RegisterPayload) => {
    const res = await authApi.register(data);

    localStorage.setItem(TOKEN_KEY, res.token);

    const normalized = normalizeUser(res.user);
    localStorage.setItem(USER_KEY, JSON.stringify(normalized));
    setUser(normalized);

    return normalized;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
  }, []);

  const setDemoUser = useCallback((u: AuthUser | null) => {
    setUser(u);

    if (u) {
      localStorage.setItem(USER_KEY, JSON.stringify(u));
    } else {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isLoggedIn: !!user,
        isAdmin: user?.role === "ADMIN",
        isParent: user?.role === "PARENT",
        login,
        register,
        logout,
        setDemoUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}