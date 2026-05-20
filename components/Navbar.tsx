"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import NotificationsDropdown from "@/components/NotificationsDropdown";
import { supabase } from "@/src/lib/supabaseClient";

export default function Navbar() {
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/auth");
  };

  return (
    <nav className="w-full border-b px-6 py-4 flex flex-wrap items-center justify-between gap-4">
      <Link href="/" className="text-2xl font-bold">
        Rentify
      </Link>

      <div className="flex flex-wrap gap-4 items-center">
        <Link href="/dashboard" className="hover:underline">
          Dashboard
        </Link>

        <Link href="/properties" className="hover:underline">
          Properties
        </Link>

        <Link href="/favorites" className="hover:underline">
          Favorites
        </Link>

        <Link href="/messages" className="hover:underline">
          Messages
        </Link>

        <Link href="/settings" className="hover:underline">
          Settings
        </Link>

        <NotificationsDropdown />

        <button
          onClick={handleLogout}
          className="bg-red-500 text-white px-4 py-2 rounded"
        >
          Logout
        </button>
      </div>
    </nav>
  );
}
