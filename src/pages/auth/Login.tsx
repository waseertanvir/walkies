import { useState } from 'react';
import logo from '../../assets/Logo.png'
import { supabase } from "../../supabaseClient";
import { useNavigate, useSearchParams } from "react-router";

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [urlParams] = useSearchParams();
    const [role, setRole] = useState('');
    const message = urlParams.get('message');

    const navigate = useNavigate();

    const checkProfileCompleteness = async (userId: string) => {
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (error || !profile) {
            return { complete: false, role: null as null | string };
        }

        const complete = Boolean(profile.full_name && profile.role && profile.phone);
        return { complete, role: profile.role as string };
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { data, error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) {
                if (error.message.includes('Email not confirmed')) {
                    alert('Please check your email and click the verification link before signing in.');
                } else if (error.message.includes('Invalid login credentials')) {
                    alert('Invalid email or password. Please check your credentials and try again.');
                } else {
                    console.log(error.message);
                    alert('Login failed: ' + error.message);
                }
                return;
            }

            const { complete, role } = await checkProfileCompleteness(data.user.id);
            setRole(role ?? ''); // optional, if you still need it in UI later
            console.log('resolved role:', role);

            if (!complete) {
                navigate('/profile');
            } else if (role === 'owner') {
                navigate('/owner/dashboard');
            } else if (role === 'walker') {
                navigate('/walker/dashboard');
            }
        } catch (err) {
            console.error('Login error:', err);
            alert('An unexpected error occurred. Please try again.');
        } finally {
            setLoading(false);
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

    // Dynamically load the Google Identity Services script
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);

    return (

        <div className="flex flex-col justify-center items-center h-full gap-20">
            <div>
                <img src={logo} className='max-w-[60%] h-auto mx-auto'></img>
                <h1 className='text-7xl text-white text-center'>Walkies</h1>
            </div>

            {message === 'check-email' && (
                <div className="bg-wsage text-white px-6 py-3 rounded-lg text-center max-w-md">
                    <p className="font-medium">Check your email!</p>
                    <p className="text-sm mt-1">We've sent you a verification link. Click it to activate your account, then come back here to sign in.</p>
                </div>
            )}

            {message === 'verified' && (
                <div className="bg-wolive text-white px-6 py-3 rounded-lg text-center max-w-md">
                    <p className="font-medium">Email verified!</p>
                    <p className="text-sm mt-1">Your account is now active. Please sign in below to continue.</p>
                </div>
            )}

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
                <div className='flex justify-center items-center gap-5'>
                    <button
                        onClick={handleLogin}
                        className='border-2 border-worange bg-worange rounded-2xl py-1.5 px-4 disabled:opacity-50 active:bg-wblue active:text-worange'
                        disabled={loading}
                    >
                        {loading ? 'Signing in...' : 'Log in'}
                    </button>
                    <button
                        onClick={() => navigate("/signup")}
                        className='border-2 border-worange text-worange rounded-2xl py-1.5 px-4 active:bg-worange active:text-black'
                    >
                        Sign Up
                    </button>
                </div>

            </div>

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
    );
};