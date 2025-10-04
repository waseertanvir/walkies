import { useState } from 'react';
import logo from '../assets/Logo.png'
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router";

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            console.log(error.message);
        } else {
            console.log('Logged in user:', data.user);
            navigate('/')
        }
    };

    (window as any).handleSignInWithGoogle = async () => {
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}` // or your homepage
            }
        })

        if (error) {
            console.error("Google sign-in error:", error.message);
        } else {
            console.log("Supabase session:", data);
            //window.location.href = "/";
        }
    };

    // 2️⃣ Dynamically load the Google Identity Services script
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);

    return (

        <div className="flex flex-col justify-center items-center h-full gap-20">
            <div>
                <img src={logo} className='max-w-[60%] h-auto mx-auto'></img>
                <h1 className='text-7xl text-white text-center'>Walkies?</h1>
            </div>

            <div className='flex flex-col gap-5'>
                <input
                    type="email"
                    value={email}
                    placeholder='Email'
                    onChange={(e) => setEmail(e.target.value)}
                    className='bg-wsage py-1.5 px-4 rounded-md drop-shadow-2xl'
                />
                <input
                    type="password"
                    value={password}
                    placeholder='Password'
                    onChange={(e) => setPassword(e.target.value)}
                    className='bg-wsage py-1.5 px-4 rounded-md drop-shadow-2xl'
                />
            </div>

            <div className='flex gap-5'>
                <button
                    onClick={handleLogin}
                    className='bg-worange rounded-2xl py-1.5 px-4'
                >
                    Log in
                </button>
                <button
                    onClick={() => navigate("/signup")}
                    className='text-worange rounded-2xl py-1.5 px-4'
                >
                    Sign Up
                </button>

                <div>
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
            </div>

        </div>
    );
};