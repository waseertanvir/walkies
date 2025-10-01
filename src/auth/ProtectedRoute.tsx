// src/components/ProtectedRoute.tsx
import {type ReactNode, useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

interface Props {
    children: ReactNode;
    fallback?: ReactNode; // optional loading indicator
}

const ProtectedRoute = ({ children, fallback = <div>Loading...</div> }: Props) => {
    const [session, setSession] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkSession = async () => {
            // Restore session if coming from OAuth redirect
            const { data } = await supabase.auth.getSession().catch(() => ({ data: null }));
            const { data: localData } = await supabase.auth.getSession();

            setSession(data?.session || localData?.session || null);
            setLoading(false);
        };

        checkSession();
    }, []);

    if (loading) return fallback;

    if (!session) {
        window.location.href = "/login"; // redirect if no session
        return null;
    }

    return <>{children}</>;
};

export default ProtectedRoute;