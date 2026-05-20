"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import NotificationsDropdown from "@/components/NotificationsDropdown";
import { supabase } from "@/src/lib/supabaseClient";
import {
  getNavItemsForRole,
  type ProfileRole,
} from "@/src/lib/navigation";

type ProfileRoleChangeEvent = CustomEvent<{ role: ProfileRole | null }>;

export default function Navbar() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [role, setRole] = useState<ProfileRole | null>(null);

  const navItems = useMemo(() => getNavItemsForRole(role), [role]);

  useEffect(() => {
    let activeUserId: string | null = null;

    const fetchRole = async (nextUserId: string | null) => {
      activeUserId = nextUserId;
      setUserId(nextUserId);

      if (!nextUserId) {
        setRole(null);
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", nextUserId)
        .maybeSingle();

      setRole((data?.role as ProfileRole | null) ?? null);
    };

    supabase.auth.getUser().then(({ data }) => {
      fetchRole(data.user?.id ?? null);
    });

    const {
      data: { subscription: authSubscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      fetchRole(session?.user?.id ?? null);
    });

    const roleChangeChannel = supabase
      .channel("navbar-profile-role")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
        },
        (payload) => {
          if (payload.new.id === activeUserId) {
            setRole((payload.new.role as ProfileRole | null) ?? null);
          }
        }
      )
      .subscribe();

    const handleRoleChange = (event: Event) => {
      setRole((event as ProfileRoleChangeEvent).detail.role);
    };

    window.addEventListener("rentify-profile-role-change", handleRoleChange);

    return () => {
      authSubscription.unsubscribe();
      supabase.removeChannel(roleChangeChannel);
      window.removeEventListener("rentify-profile-role-change", handleRoleChange);
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUserId(null);
    setRole(null);
    router.push("/auth");
  };

  return (
    <nav className="w-full border-b px-6 py-4 flex flex-wrap items-center justify-between gap-4">
      <Link href="/" className="text-2xl font-bold">
        Rentify
      </Link>

      <div className="flex flex-wrap gap-4 items-center">
        {navItems.map((item) => (
          <Link key={item.href} href={item.href} className="hover:underline">
            {item.label}
          </Link>
        ))}

        {userId ? (
          <>
            <NotificationsDropdown />

            <button
              onClick={handleLogout}
              className="bg-red-500 text-white px-4 py-2 rounded"
            >
              Logout
            </button>
          </>
        ) : (
          <Link href="/auth" className="hover:underline">
            Login
          </Link>
        )}
      </div>
    </nav>
  );
}
