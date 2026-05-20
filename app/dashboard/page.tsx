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

  const addProperty = async () => {
    if (!profile) return;

    setSaving(true);

    let imageUrl = "";

    // UPLOAD IMAGE
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

    // SAVE PROPERTY
    const { error } = await supabase.from("properties").insert([
      {
        owner_id: (await supabase.auth.getUser()).data.user?.id,
        title,
        description,
        price: Number(price),
        location,
        image_url: imageUrl,
      },
    ]);

    setSaving(false);

    if (error) {
      alert(error.message);
      return;
    }

    alert("Property added successfully");

    setTitle("");
    setDescription("");
    setPrice("");
    setLocation("");
    setImage(null);
  };
  useEffect(() => {
    const loadUser = async () => {
      try {
        console.log("Loading dashboard...");

        // 1. Get logged-in user
        const { data: userData, error: userError } =
          await supabase.auth.getUser();

        console.log("USER DATA:", userData);
        console.log("USER ERROR:", userError);

        if (userError || !userData?.user) {
          router.push("/auth");
          return;
        }

        // 2. Get profile from database
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userData.user.id)
          .maybeSingle();

        console.log("PROFILE DATA:", profileData);
        console.log("PROFILE ERROR:", profileError);

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

        // IF ROLE NOT CHOSEN YET
        if (!profileData.role) {
          router.push("/onboarding");
          return;
        }

        setProfile(profileData as Profile);
        setLoading(false);
      } catch (err: unknown) {
        console.log("CATCH ERROR:", err);
        setError(err instanceof Error ? err.message : "Unable to load dashboard");
        setLoading(false);
      }
    };

    loadUser();
  }, [router]);

  // LOADING STATE
  if (loading) {
    return (
      <div className="p-6">
        <p>Loading dashboard...</p>
      </div>
    );
  }

  // ERROR STATE
  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-red-600 text-xl font-bold">Error</h1>
        <p className="mt-2">{error}</p>

        <button
          className="mt-4 bg-blue-500 text-white px-4 py-2 rounded"
          onClick={() => router.push("/auth")}
        >
          Go to Login
        </button>
      </div>
    );
  }

  // MAIN DASHBOARD
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Rentify Dashboard</h1>

      <p className="mt-2">Email: {profile?.email}</p>
      <p className="mt-1">Role: {profile?.role}</p>

      <button
        className="mt-2 text-sm text-blue-600 underline"
        onClick={async () => {
          if (!profile) return;

          const newRole = profile.role === "landlord" ? "tenant" : "landlord";

          await supabase
            .from("profiles")
            .update({ role: newRole })
            .eq("id", profile.id);

          window.location.reload();
        }}
      >
        Switch to {profile?.role === "landlord" ? "Tenant" : "Landlord"}
      </button>

      {/* LANDLORD VIEW */}
      {profile?.role === "landlord" && (
        <div className="mt-6 p-4 border rounded">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-xl font-semibold">Landlord Panel</h2>
            <Link
              href="/dashboard/properties"
              className="inline-flex items-center justify-center rounded bg-neutral-950 px-4 py-2 text-sm font-medium text-white"
            >
              Manage Properties
            </Link>
          </div>

          <div className="mt-4 space-y-3">
            <input
              className="w-full border p-2 rounded"
              placeholder="Property Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />

            <textarea
              className="w-full border p-2 rounded"
              placeholder="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />

            <input
              className="w-full border p-2 rounded"
              placeholder="Price"
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />

            <input
              className="w-full border p-2 rounded"
              placeholder="Location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />

            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  setImage(e.target.files[0]);
                }
              }}
            />

            <button
              onClick={addProperty}
              disabled={saving}
              className="bg-green-600 text-white px-4 py-2 rounded"
            >
              {saving ? "Saving..." : "Add Property"}
            </button>
          </div>
        </div>
      )}

      {/* TENANT VIEW */}
      {profile?.role === "tenant" && (
        <div className="mt-6 p-4 border rounded">
          <h2 className="text-xl font-semibold">Tenant Panel</h2>
          <p>Browse properties coming soon...</p>
        </div>
      )}

      {/* LOGOUT */}
      <button
        className="mt-8 bg-red-500 text-white px-4 py-2 rounded"
        onClick={async () => {
          await supabase.auth.signOut();
          router.push("/auth");
        }}
      >
        Logout
      </button>
    </div>
  );
}
