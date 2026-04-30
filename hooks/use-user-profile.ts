"use client";
import { useState, useEffect } from "react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";

export interface UserProfile {
  userId: string;
  profileType: string | null;
  wallets: { id: string; address: string }[];
}

export function useUserProfile(): UserProfile | null {
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    const supabase = createSupabaseBrowser();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      Promise.all([
        supabase.from("user_profiles").select("profile_type").eq("id", user.id).single(),
        supabase.from("user_wallets").select("id, address").eq("user_id", user.id),
      ]).then(([profileRes, walletsRes]) => {
        setProfile({
          userId: user.id,
          profileType: profileRes.data?.profile_type ?? null,
          wallets: walletsRes.data ?? [],
        });
      });
    });
  }, []);

  return profile;
}
