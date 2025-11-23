// Redirects users to approriate dashboard when already logged in or returning to "/"
import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import OwnerDashboard from "./owner/OwnerDashboard";
import WalkerDashboard from "./walker/WalkerDashboard";

type Role = "owner" | "walker" | null;

export default function Dashboard() {
  const [role, setRole] = useState<Role>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkRole = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          window.location.href = "/login"; 
          return;
        }

        const { data: profile, error } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

        if (error) throw error;

        if (profile?.role === "owner") {
          setRole("owner");
          window.history.replaceState({}, "", "/owner/dashboard"); 
        } else if (profile?.role === "walker") {
          setRole("walker");
          window.history.replaceState({}, "", "/walker/dashboard");
        } else {
          window.location.href = "/userprofile"; 
        }

      } catch (err) {
        console.error("Error fetching role:", err);
        window.location.href = "/login";
      } finally {
        setLoading(false);
      }
    };

    checkRole();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-wblue text-white">
        Redirecting...
      </div>
    );
  }

  if (role === "owner") return <OwnerDashboard />;
  if (role === "walker") return <WalkerDashboard />;

  return null;
}