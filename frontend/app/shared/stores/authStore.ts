import { create } from "zustand";
import { persist } from "zustand/middleware";
// import { LoginResponse, User, UserRole } from "@/shared/sdk/chronos";
// import { api } from "../sdk/lib/api-client";
// import { useTenantStore } from "./tenantStore";
// import { userRoleToString } from "../util/role";

interface AuthUser {
  name: string;
  email: string;
  id: number;
  role: "student" | "admin";
  avatarUrl: string;
  phone: string | null;
  tenantId: number;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  tenantId: number | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  setAuth: (data: any) => void;
  setError: (error: string | null) => void;
  setLoading: (isLoading: boolean) => void;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  initialize: () => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      token: null,
      tenantId: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // Set auth data from login response
      setAuth: (data: any) => {
        set({
          user: {
            id: data.id,
            name: data.name,
            email: data.email,
            avatarUrl: data.avatarUrl || "",
            role: data.role,
            phone: data.phone || "",
            tenantId: data.tenantId,
          },
          token: data.token,
          isAuthenticated: true,
          error: null,
        });

        // Store in localStorage for API middleware
        localStorage.setItem("auth_token", data.token);
        localStorage.setItem("user_role", data.role);
        localStorage.setItem("tenant_id", data.tenantId.toString());
        localStorage.setItem("user_name", data.name);
        localStorage.setItem("user_email", data.email);
        localStorage.setItem("user_id", data.id.toString());
      },

      setError: (error) => set({ error }),
      setLoading: (isLoading) => set({ isLoading }),
      clearError: () => set({ error: null }),

      // Login action
      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });

        try {
          // const response = await api.auth.login({ email, password });
          // get().setAuth(response);
          set({ isLoading: false });
        } catch (error: any) {
          set({
            error: error.message || "Login failed",
            isLoading: false,
            isAuthenticated: false,
          });
          throw error;
        }
      },

      // Logout action
      logout: () => {
        // Clear Zustand state
        set({
          user: null,
          token: null,
          tenantId: null,
          isAuthenticated: false,
          error: null,
          isLoading: false,
        });

        // Clear localStorage
        localStorage.removeItem("auth_token");
        localStorage.removeItem("user_role");
        localStorage.removeItem("tenant_id");
        localStorage.removeItem("user_name");
        localStorage.removeItem("user_email");
        localStorage.removeItem("user_phone");
        localStorage.removeItem("user_id");

        // Redirect to login
        window.location.href = "/auth";
      },

      initialize: () => {
        const token = localStorage.getItem("auth_token");
        const userRole = localStorage.getItem("user_role");
        const userId = localStorage.getItem("user_id");
        const userName = localStorage.getItem("user_name");
        const userEmail = localStorage.getItem("user_email");
        const userPhone = localStorage.getItem("user_phone");
        const avatarUrl = localStorage.getItem("avatar_url");
        const tenantId = localStorage.getItem("tenant_id");

        if (token && userId && tenantId && userEmail && userName) {
          const parsedTenantId = parseInt(tenantId);
          const user: AuthUser = {
            id: parseInt(userId),
            name: userName,
            email: userEmail,
            phone: userPhone,
            avatarUrl: avatarUrl || "",
            role: "admin",
            tenantId: parsedTenantId,
          };

          set({
            token,
            user,
            tenantId: parsedTenantId,
            isAuthenticated: true,
          });
        }
      },
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        tenantId: state.tenantId,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.tenantId) {
          // useTenantStore.getState().setTenant(state.tenantId, "auth");
        }
      },
    },
  ),
);
