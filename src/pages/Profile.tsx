import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { supabase } from '../supabaseClient';
import ProtectedRoute from '../auth/ProtectedRoute';
import { Card, Button } from '../components/ui';
import { ChevronLeft } from 'lucide-react';

interface Profile {
  id: string;
  full_name: string;
  role: string;
  phone: string;
  bio?: string;
  years_experience?: number;
  email: string;
}

export default function Profile() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);
  const [canChangeRole, setCanChangeRole] = useState(false);

  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    role: '',
    bio: '',
    years_experience: 0
  });

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) console.error(error);

      if (profileData) {
        setProfile(profileData);
        setFormData({
          full_name: profileData.full_name || '',
          phone: profileData.phone || '',
          role: profileData.role || '',
          bio: profileData.bio || '',
          years_experience: profileData.years_experience || 0
        });

        const isIncomplete = !profileData.full_name || !profileData.phone || !profileData.role;
        setIsNewUser(isIncomplete);
        const profileAge = Date.now() - new Date(profileData.created_at).getTime();
        setCanChangeRole(isIncomplete || profileAge < 5 * 60 * 1000);
      } else {
        setIsNewUser(true);
        setCanChangeRole(true);
      }

      setLoading(false);
    };

    fetchProfile();
  }, []);

  const saveProfile = async () => {
    setProfileLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          email: user.email,
          full_name: formData.full_name,
          phone: formData.phone,
          role: formData.role,
          bio: formData.bio || null,
          years_experience: formData.years_experience || null
        });

      if (error) {
        alert('Error saving profile: ' + error.message);
        return;
      }

      if (!isNewUser) setCanChangeRole(false);
      alert('Profile saved successfully!');
      navigate('/userprofile');
    } catch (error) {
      console.error(error);
      alert('Unexpected error saving profile');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  if (loading)
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-wblue flex items-center justify-center text-white text-xl">
          Loading...
        </div>
      </ProtectedRoute>
    );

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-wblue flex items-center justify-center p-4 relative">
        <div className="absolute top-4 left-4 z-50">
          <button
            onClick={() => navigate('/userprofile')}
            className="fixed top-4 left-4 z-50 bg-wsage/75 backdrop-blur-sm text-black p-2 rounded-full shadow-lg"
          >
            <ChevronLeft size={30} />
          </button>
        </div>

        <div className="w-full max-w-md">
          <Card>
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-wblue mb-4">Basic Information</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-wblue mb-1">Email</label>
                    <input
                      type="email"
                      value={profile?.email || ''}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-wblue mb-1">Full Name</label>
                    <input
                      type="text"
                      value={formData.full_name}
                      onChange={e =>
                        setFormData(prev => ({ ...prev, full_name: e.target.value }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-wblue"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-wblue mb-1">Phone</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={e =>
                        setFormData(prev => ({ ...prev, phone: e.target.value }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-wblue"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-wblue mb-1">Role</label>
                    {canChangeRole ? (
                      <select
                        value={formData.role}
                        onChange={e =>
                          setFormData(prev => ({ ...prev, role: e.target.value }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-wblue"
                      >
                        <option value="">Select your role</option>
                        <option value="owner">Pet Owner</option>
                        <option value="walker">Dog Walker</option>
                      </select>
                    ) : (
                      <div className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-gray-700 capitalize">
                        {formData.role}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {formData.role === 'walker' && (
                <div>
                  <h2 className="text-lg font-semibold text-wblue mb-4">Walker Information</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-wblue mb-1">
                        Years of Experience
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={formData.years_experience}
                        onChange={e =>
                          setFormData(prev => ({
                            ...prev,
                            years_experience: parseInt(e.target.value) || 0
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-wblue"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-wblue mb-1">Bio</label>
                      <textarea
                        value={formData.bio}
                        onChange={e =>
                          setFormData(prev => ({ ...prev, bio: e.target.value }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-wblue"
                        rows={4}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-4 border-t flex justify-between">
                <Button onClick={saveProfile} disabled={profileLoading}>
                  {profileLoading ? 'Saving...' : 'Save Profile'}
                </Button>
                <Button variant="danger" onClick={handleSignOut}>
                  Sign Out
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  );
}
