import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL!,
  import.meta.env.VITE_SUPABASE_ANON_KEY!
);

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuth = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      let next = params.get("next") ?? "/";

      if (!next.startsWith("/")) {
        next = "/";
      }

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (!error) {
          navigate(next, { replace: true });
          return;
        }
      }

      // if failed
      navigate("/auth/auth-code-error", { replace: true });
    };

    handleAuth();
  }, [navigate]);
}