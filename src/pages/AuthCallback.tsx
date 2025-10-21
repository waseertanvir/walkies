import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { supabase } from '../supabaseClient';

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Get the session (Supabase automatically handles the token)
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Auth callback error:', error);
          navigate('/login');
          return;
        }

        if (data.session) {
          // User is verified, but we want them to login properly
          await supabase.auth.signOut(); // Clear the auto-session
          navigate('/login?message=verified'); // Redirect to login with success message
        } else {
          navigate('/login'); // No session - go to login
        }
      } catch (error) {
        console.error('Unexpected error:', error);
        navigate('/login');
      }
    };

    handleAuthCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-wblue flex items-center justify-center">
      <div className="text-white text-xl">Verifying your email...</div>
    </div>
  );
}
