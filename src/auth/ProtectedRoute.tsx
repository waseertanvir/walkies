// src/components/ProtectedRoute.tsx
import { type ReactNode, useEffect, useState } from "react";
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


    type UserLocation = {
        userID: string,
        role: string,
        name: string,
        position: { lat: number; lng: number },
        timestamp: Date,
    };

    useEffect(() => {
        let channel: ReturnType<typeof supabase.channel>;

        //get user data
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('full_name, role')
                .eq('id', user?.id)
                .single();

            if (profileError) {
                console.error('Error fetching profile:', profileError);
                return null;
            }
            if (profile.role != 'walker') return;
            channel = supabase
                .channel("liveLocations")
                .on('broadcast', { event: "location" }, (payload) => {
                    console.log('received payload: ', payload.payload, '\n\n')
                    const tempUserLocation: UserLocation = {
                        userID: payload.payload.userID,
                        role: payload.payload.role,
                        name: payload.payload.name,
                        position: payload.payload.position,
                        timestamp: payload.payload.timestamp,
                    }
                })
                .subscribe();

            const sendLocation = async (updatedPosition: any) => {
                //broadcast user position to realtime
                await channel
                    .send({
                        type: "broadcast",
                        event: "location",
                        payload: {
                            userID: user?.id,
                            role: profile?.role,
                            name: profile?.full_name,
                            position: updatedPosition,
                            timestamp: new Date().toISOString(),
                        },
                    });
            }
            const watchId = navigator.geolocation.watchPosition(
                (position) => {
                    // update user position
                    const newPosition = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };
                    console.log("My broadcasted position: ", newPosition, '\n')
                    //broadcast location
                    sendLocation(newPosition)
                },
                async (error) => {
                    console.error("Error watching location: ", error);
                    if (error.code === error.POSITION_UNAVAILABLE) {
                        // Fallback: approximate by IP
                        const res = await fetch('https://ipapi.co/json/');
                        const data = await res.json();
                        const newPosition = {
                            lat: data.latitude,
                            lng: data.longitude,
                        };
                        console.log('Broadcasting location using IP')
                        sendLocation(newPosition)
                    }
                },
                { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
            );
        };

        init();

        return () => {
            if (channel) supabase.removeChannel(channel);
        };
    }, []);

    if (loading) return fallback;

    if (!session) {
        window.location.href = "/login"; // redirect if no session
        return null;
    }

    return <>{children}</>;
};

export default ProtectedRoute;