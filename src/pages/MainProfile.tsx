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
        <div className="top-4 left-4 z-50">
          <button
            onClick={() => {
              if (profile?.role === 'walker') {
                navigate('/walker/dashboard');
              } else if (profile?.role === 'owner') {
                navigate('/owner/dashboard');
              } else {
                navigate('/');
              }
            }}
            className="bg-wolive text-black p-2 rounded-full shadow-lg hover:bg-green-600 transition-colors"
          >
            <ChevronLeft size={30} />
          </button>
        </div>

        <div className="max-w-3xl mx-auto mt-16">
          <h1 className="text-3xl font-bold text-black mb-6 text-center">Profile</h1>

          <div className="flex justify-center mb-8">
            <div className="w-32 h-32 rounded-full bg-gray-300 border-4 border-white flex items-center justify-center shadow-lg">
              <span className="text-white text-xl">No Image</span>
            </div>
          </div>

          <div className='grid mb-6'>
            <Card className="bg-[#D9D9D9] p-4 w-full">
              <h2 className="font-semibold text-xs text-gray-600 mb-2">
                Full Name
              </h2>
              <input className="w-full font-semibold" type="text" value={profile?.full_name ?? '—'} />
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <Card className="bg-[#D9D9D9] p-4">
              <h2 className="font-semibold text-xs text-gray-600 mb-2">
                Gender
              </h2>
              <input className="w-full font-semibold" type="text" value={profile?.email || '—'} />
            </Card>

            <Card className="bg-[#D9D9D9] p-4">
              <h2 className="font-semibold text-xs text-gray-600 mb-2">
                Birthday
              </h2>
              <input className="w-full font-semibold" type="text" value="01-01-2001" />
            </Card>

          </div>

          <div className='grid mb-6 w-full'>
            <Card className="bg-[#D9D9D9] p-4 mb-6">
              <h2 className="font-semibold text-xs text-gray-600 mb-2">
                Phone Number
              </h2>
              <input className="font-semibold" type="text" value="(+1) 123-456-8974" />
            </Card>

            <Card className="bg-[#D9D9D9] p-4 mb-6">
              <h2 className="font-semibold text-xs text-gray-600 mb-2">
                Email
              </h2>
              <input className="font-semibold" type="text" value="helloworld@gmail.com" />
            </Card>
            
            <Card className="bg-[#D9D9D9] p-4 mb-6">
              <h2 className="font-semibold text-xs text-gray-600 mb-2">
                Edit Description
              </h2>
              <input className="font-semibold" type="text" value="Lorem ipsum" />
            </Card>
          </div>

          <div className="grid justify-center">
            {profile?.role === 'owner' && (
              <Button className='mb-6'
                onClick={() => navigate('/view-dogs')}
              >
                Edit Dogs
              </Button>
            )}

            <Button
              onClick={() => navigate('/profile', { state: { cameFromUserProfile: true } })}
            >
              Save
            </Button>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
