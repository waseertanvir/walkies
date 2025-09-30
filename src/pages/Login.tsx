import { createClient } from "@supabase/supabase-js";
import { useEffect } from "react";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL!,
  import.meta.env.VITE_SUPABASE_ANON_KEY!
);

export default function Login() {
  useEffect(() => {
    // 1️⃣ Add Google callback to window
    (window as any).handleSignInWithGoogle = async (response: any) => {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `http://localhost:5173/auth/callback`,
        },
      });

      if (error) {
        console.error("Google sign-in error:", error.message);
      } else {
        console.log("Supabase session:", data);
        window.location.href = "/";
      }
    };

    // 2️⃣ Dynamically load the Google Identity Services script
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  return (
    <div>
      <h2>Sign in</h2>
      {/* Google button container */}
      <div
        id="g_id_onload"
        data-client_id={import.meta.env.VITE_GOOGLE_CLIENT_ID}
        data-callback="handleSignInWithGoogle"
      ></div>
      <div
        className="g_id_signin"
        data-type="standard"
        data-shape="rectangular"
        data-theme="outline"
        data-text="sign_in_with"
        data-size="large"
        data-logo_alignment="left"
      ></div>
    </div>
  );
}