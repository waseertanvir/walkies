import { useRef, useState } from 'react';
import logo from '../../assets/Logo.png';
import { supabase } from "../../supabaseClient";
import { useNavigate, useSearchParams } from "react-router";

export default function Login() {
    const emailRef = useRef<HTMLInputElement>(null);
    const passwordRef = useRef<HTMLInputElement>(null);

    const [loading, setLoading] = useState(false);
    const [urlParams] = useSearchParams();
    const message = urlParams.get('message');

  const navigate = useNavigate();

  const checkProfileCompleteness = async (userId: string) => {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
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

        const email = emailRef.current?.value || '';
        const password = passwordRef.current?.value || '';

        try {
            const { data, error } = await supabase.auth.signInWithPassword({ email, password });

            if (error) {
                if (error.message.includes('Email not confirmed')) {
                    alert('Please check your email and click the verification link before signing in.');
                } else if (error.message.includes('Invalid login credentials')) {
                    alert('Invalid email or password. Please try again.');
                } else {
                    alert('Login failed: ' + error.message);
                }
                return;
            }

            const { complete, role } = await checkProfileCompleteness(data.user.id);

            if (!complete) {
                navigate('/userprofile');
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
                redirectTo: `${window.location.origin}`
            }
        })

        if (error) {
            console.error("Google sign-in error:", error.message);
        }
    };

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);

    return (
        <div className="flex flex-col justify-center items-center h-full gap-20">
            <div>
                <img src={logo} className='max-w-[60%] h-auto mx-auto' />
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

            <form className='flex flex-col gap-5' onSubmit={handleLogin}>
                <input
                    ref={emailRef}
                    type="email"
                    placeholder='Email'
                    className='bg-wsage py-1.5 px-4 rounded-md drop-shadow-2xl'
                />

                <input
                    ref={passwordRef}
                    type="password"
                    placeholder='Password'
                    className='bg-wsage py-1.5 px-4 rounded-md drop-shadow-2xl'
                />

                <button
                    type="button"
                    onClick={async () => {
                        const email = emailRef.current?.value;
                        if (!email) {
                            alert('Please enter your email address first');
                            return;
                        }
                        const { error } = await supabase.auth.resetPasswordForEmail(email, {
                            redirectTo: `${window.location.origin}/auth/reset-password`,
                        });
                        if (error) {
                            alert('Error: ' + error.message);
                        } else {
                            alert('Password reset email sent! Check your inbox.');
                        }
                    }}
                    className='text-sm text-wsage hover:text-wolive underline text-center'
                >
                    Forgot password?
                </button>

                <div className='flex justify-center items-center gap-5'>
                    <button
                        type="submit"
                        className='border-2 border-worange bg-worange rounded-2xl py-1.5 px-4 disabled:opacity-50 active:bg-wblue active:text-worange'
                        disabled={loading}
                    >
                        {loading ? 'Signing in...' : 'Log in'}
                    </button>

                    <button
                        type="button"
                        onClick={() => navigate("/signup")}
                        className='border-2 border-worange text-worange rounded-2xl py-1.5 px-4 active:bg-worange active:text-black'
                    >
                        Sign Up
                    </button>
                </div>
            </form>

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
}
