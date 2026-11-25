import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../stores/authStore";
// import { api } from "../sdk/lib/api-client";

import { useUIStore } from "../stores/uiStore";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabaseClient";

export const authKeys = {
  all: ["auth"] as const,
  user: () => [...authKeys.all, "user"] as const,
  session: () => [...authKeys.all, "session"] as const,
  profile: (id: string) => [...authKeys.all, "profile", id] as const,
};

export const useLogout = () => {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  async function logout() {
    if (isLoggingOut) return; // prevent double-clicks
    setIsLoggingOut(true);

    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      router.refresh();
      router.replace("/login");
    } catch (caught) {
      toast({
        title: "Logout failed",
        description:
          caught instanceof Error
            ? caught.message
            : "Unable to sign out. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoggingOut(false);
    }
  }

  return { logout, isLoggingOut };
};

export const useCurrentUser = () =>
  useQuery({
    queryKey: authKeys.user(),
    queryFn: async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        // "Auth session missing!" means signed out — treat as null, don't throw
        if (error.name === "AuthSessionMissingError") return null;
        throw error;
      }
      return data.user;
    },
    staleTime: 60_000,
  });

export const useCurrentProfile = () => {
  const { data: user } = useCurrentUser();
  return useQuery({
    queryKey: authKeys.profile(user?.id ?? "anon"),
    queryFn: async () => {
      if (!user) return null;
      // adjust to wherever your profile lives — same helper Login used
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();
      if (error) throw error;
      return data as {
        user_id: string;
        full_name: string | null;
        avatar_url: string | null;
        user_type: string;
        is_approved: boolean;
      };
    },
    enabled: !!user,
    staleTime: 5 * 60_000,
  });
};
