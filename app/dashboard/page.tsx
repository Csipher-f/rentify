"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/src/lib/supabaseClient";

type Profile = {
  id: string;
  email: string | null;
  role: "landlord" | "tenant" | null;
};

const landlordNavItems = [
  { href: "/dashboard/properties", label: "Property management" },
  { href: "/messages", label: "Messages" },
  { href: "/settings", label: "Account settings" },
];

const tenantNavItems = [
  { href: "/properties", label: "Browse properties" },
  { href: "/favorites", label: "Saved homes" },
  { href: "/messages", label: "Messages" },
  { href: "/settings", label: "Account settings" },
];

export default function Dashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [location, setLocation] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const { data: userData, error: userError } =
          await supabase.auth.getUser();

        if (userError || !userData?.user) {
          router.push("/auth");
          return;
        }

        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("id,email,role")
          .eq("id", userData.user.id)
          .maybeSingle();

        if (profileError) {
          setError(profileError.message);
          setLoading(false);
          return;
        }

        if (!profileData) {
          setError("Profile not found");
          setLoading(false);
          return;
        }

        if (!profileData.role) {
          router.push("/onboarding");
          return;
        }

        setProfile(profileData as Profile);
        setLoading(false);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Unable to load dashboard");
        setLoading(false);
      }
    };

    loadUser();
  }, [router]);

  const addProperty = async () => {
    if (!profile || profile.role !== "landlord") return;

    setSaving(true);

    let imageUrl = "";

    if (image) {
      const fileName = `${Date.now()}-${image.name}`;

      const { error: uploadError } = await supabase.storage
        .from("property-images")
        .upload(fileName, image);

      if (uploadError) {
        alert(uploadError.message);
        setSaving(false);
        return;
      }

      const { data } = supabase.storage
        .from("property-images")
        .getPublicUrl(fileName);

      imageUrl = data.publicUrl;
    }

    const { error: insertError } = await supabase.from("properties").insert([
      {
        owner_id: profile.id,
        title,
        description,
        price: Number(price),
        location,
        image_url: imageUrl,
      },
    ]);

    setSaving(false);

    if (insertError) {
      alert(insertError.message);
      return;
    }

    alert("Property added successfully");
    setTitle("");
    setDescription("");
    setPrice("");
    setLocation("");
    setImage(null);
  };

  const switchRole = async () => {
    if (!profile) return;

    const newRole = profile.role === "landlord" ? "tenant" : "landlord";

    await supabase.from("profiles").update({ role: newRole }).eq("id", profile.id);
    window.location.reload();
  };

  if (loading) {
    return <div className="p-6">Loading dashboard...</div>;
  }

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-bold text-red-600">Error</h1>
        <p className="mt-2">{error}</p>
        <button
          className="mt-4 rounded bg-blue-500 px-4 py-2 text-white"
          onClick={() => router.push("/auth")}
        >
          Go to Login
        </button>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-50 p-6 text-neutral-950">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-neutral-500">
              {profile?.role === "landlord" ? "Landlord workspace" : "Tenant workspace"}
            </p>
            <h1 className="mt-1 text-3xl font-bold">Rentify Dashboard</h1>
            <p className="mt-2 text-sm text-neutral-600">
              {profile?.email} - {profile?.role}
            </p>
          </div>

          <button
            className="text-sm font-semibold text-blue-600 underline"
            onClick={switchRole}
          >
            Switch to {profile?.role === "landlord" ? "Tenant" : "Landlord"}
          </button>
        </div>

        {profile?.role === "landlord" && (
          <section className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-semibold">Landlord operations</h2>
                  <p className="mt-1 text-sm text-neutral-500">
                    Manage listings, revenue, tenant conversations, and issues.
                  </p>
                </div>
                <Link
                  href="/dashboard/properties"
                  className="inline-flex items-center justify-center rounded bg-neutral-950 px-4 py-2 text-sm font-medium text-white"
                >
                  Manage Properties
                </Link>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {landlordNavItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="rounded-md border border-neutral-200 p-4 text-sm font-semibold transition hover:bg-neutral-50"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-md bg-neutral-50 p-4">
                  <p className="text-sm text-neutral-500">Monthly revenue</p>
                  <p className="mt-2 text-2xl font-bold">NGN 0</p>
                </div>
                <div className="rounded-md bg-neutral-50 p-4">
                  <p className="text-sm text-neutral-500">Active tenants</p>
                  <p className="mt-2 text-2xl font-bold">0</p>
                </div>
                <div className="rounded-md bg-neutral-50 p-4">
                  <p className="text-sm text-neutral-500">Open issues</p>
                  <p className="mt-2 text-2xl font-bold">0</p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm">
              <h2 className="text-xl font-semibold">Add listing</h2>
              <p className="mt-1 text-sm text-neutral-500">
                Create a property listing from your landlord workspace.
              </p>

              <div className="mt-4 space-y-3">
                <input
                  className="w-full rounded border p-2"
                  placeholder="Property Title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                />
                <textarea
                  className="w-full rounded border p-2"
                  placeholder="Description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                />
                <input
                  className="w-full rounded border p-2"
                  placeholder="Price"
                  type="number"
                  value={price}
                  onChange={(event) => setPrice(event.target.value)}
                />
                <input
                  className="w-full rounded border p-2"
                  placeholder="Location"
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                />
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => setImage(event.target.files?.[0] ?? null)}
                />
                <button
                  onClick={addProperty}
                  disabled={saving}
                  className="rounded bg-green-600 px-4 py-2 text-white disabled:opacity-60"
                >
                  {saving ? "Saving..." : "Add Property"}
                </button>
              </div>
            </div>
          </section>
        )}

        {profile?.role === "tenant" && (
          <section className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm">
              <h2 className="text-xl font-semibold">Tenant home</h2>
              <p className="mt-1 text-sm text-neutral-500">
                Find homes, track saved listings, message landlords, and manage rental tasks.
              </p>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {tenantNavItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="rounded-md border border-neutral-200 p-4 text-sm font-semibold transition hover:bg-neutral-50"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold">Active lease</h2>
                <p className="mt-2 text-sm text-neutral-500">
                  No active lease connected yet.
                </p>
              </div>
              <div className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold">Payments</h2>
                <p className="mt-2 text-sm text-neutral-500">
                  Payment tracking will appear here when a lease is active.
                </p>
              </div>
              <div className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold">Maintenance requests</h2>
                <p className="mt-2 text-sm text-neutral-500">
                  No open maintenance requests.
                </p>
              </div>
            </div>
          </section>
        )}

        <button
          className="mt-8 rounded bg-red-500 px-4 py-2 text-white"
          onClick={async () => {
            await supabase.auth.signOut();
            router.push("/auth");
          }}
        >
          Logout
        </button>
      </div>
    </main>
  );
}
