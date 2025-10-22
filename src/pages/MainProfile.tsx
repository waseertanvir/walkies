import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { supabase } from '../supabaseClient';
import ProtectedRoute from '../auth/ProtectedRoute';
import { Card, Button } from '../components/ui';
import { ChevronLeft } from 'lucide-react';

export default function MainProfile() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) console.error(error);
      setProfile(data);
      setLoading(false);
    };

    fetchProfile();
  }, []);

  if (loading) return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#619B8A] flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    </ProtectedRoute>
  );

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#619B8A] p-4">
        <div className="absolute top-4 left-4 z-50">
          <button
            onClick={() => navigate('/')}
            className="bg-wolive text-black p-2 rounded-full shadow-lg hover:bg-green-600 transition-colors"
          >
            <ChevronLeft size={30} />
          </button>
        </div>

        <div className="max-w-3xl mx-auto mt-16">
          <h1 className="text-3xl font-bold text-white mb-6 text-center">Profile</h1>

          <div className="flex justify-center mb-8">
            <div className="w-32 h-32 rounded-full bg-gray-300 border-4 border-white flex items-center justify-center shadow-lg">
              <span className="text-white text-xl">No Image</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <Card className="bg-[#D9D9D9] p-4">
              <h2 className="font-semibold text-lg mb-2">Full Name</h2>
              <p>{profile?.full_name || '—'}</p>
            </Card>

            <Card className="bg-[#D9D9D9] p-4">
              <h2 className="font-semibold text-lg mb-2">Email</h2>
              <p>{profile?.email || '—'}</p>
            </Card>

            <Card className="bg-[#D9D9D9] p-4">
              <h2 className="font-semibold text-lg mb-2">Phone</h2>
              <p>{profile?.phone || '—'}</p>
            </Card>

            <Card className="bg-[#D9D9D9] p-4">
              <h2 className="font-semibold text-lg mb-2">Role</h2>
              <p className="capitalize">{profile?.role || '—'}</p>
            </Card>

            <Card className="bg-[#D9D9D9] p-4 md:col-span-2">
              <h2 className="font-semibold text-lg mb-2">Bio</h2>
              <p>{profile?.bio || '—'}</p>
            </Card>
          </div>

          <div className="flex justify-between">
            {profile?.role === 'owner' && (
              <Button
                onClick={() => navigate('/view-dogs')}
              >
                View Dogs
              </Button>
            )}

            <Button
              onClick={() => navigate('/profile', { state: { cameFromUserProfile: true } })}
            >
              Edit Profile
            </Button>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
