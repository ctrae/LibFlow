import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../stores/authStore";
// import { api } from "../sdk/lib/api-client";

import { useUIStore } from "../stores/uiStore";

export const authKeys = {
  all: ["auth"] as const,
  user: () => [...authKeys.all, "user"] as const,
  session: () => [...authKeys.all, "session"] as const,
};

export const useLogin = () => {
  const queryClient = useQueryClient();
  const { setAuth, setError, clearError } = useAuthStore();
  const { showSuccess, showError } = useUIStore();

  return useMutation({
    mutationFn: async ({
      email,
      password,
    }: {
      email: string;
      password: string;
    }) => {
      queryClient.clear();
      clearError();

      // Ensure auth is in clean state
      const authStore = useAuthStore.getState();
      if (authStore.isAuthenticated) {
        authStore.logout();
      }

      const response = await Promise.resolve({
        id: 1,
        name: "John Doe",
        email: email,
        avatarUrl: "",
        phone: null,
        tenantId: 1,
        token: "fake-jwt-token",
      });
      return response;
    },

    onSuccess: (data: any) => {
      setAuth(data);
      showSuccess(`Welcome back, ${data.name}!`, "Success");
    },

    onError: (error: any) => {
      showError(error.message || "Login failed", "Error");
      setError(error.message || "Login failed");
    },
  });
};

export const useLogout = () => {
  const queryClient = useQueryClient();
  const { logout } = useAuthStore();

  return useMutation({
    mutationFn: async () => {
      return Promise.resolve();
    },

    onSuccess: () => {
      queryClient.clear();
      logout();
    },
  });
};

export const useCurrentUser = () => {
  const { user, token, isAuthenticated } = useAuthStore();

  return useQuery({
    queryKey: authKeys.user(),
    queryFn: async () => {
      if (!token) return null;
      return user;
    },
    enabled: isAuthenticated && !!token,
    staleTime: 5 * 60 * 1000,
  });
};
