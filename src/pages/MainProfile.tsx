import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { supabase } from '../supabaseClient';
import ProtectedRoute from '../auth/ProtectedRoute';
import { Card, Button } from '../components/ui';
import { ChevronLeft } from 'lucide-react';

export default function MainProfile() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    email: '',
    role: '',
    bio: '',
    years_experience: 0,
  });

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [canChangeRole, setCanChangeRole] = useState(false);

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
      else {
        setProfile(data);
        setFormData({
          full_name: data.full_name || '',
          phone: data.phone || '',
          email: data.email || user.email || '',
          role: data.role || '',
          bio: data.bio || '',
          years_experience: data.years_experience || 0,
        });
        setAvatarUrl(data.avatar_url || null);
        setCanChangeRole(!data.role || data.role === '');
      }

      setLoading(false);
    };

    fetchProfile();
  }, []);

  const handleSave = async () => {
    if (canChangeRole && !formData.role) {
      alert("Please select a role");
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const updates: any = {
        id: user.id,
        email: user.email,
        full_name: formData.full_name,
        phone: formData.phone,
        bio: formData.bio || null,
        years_experience: formData.years_experience || null,
        avatar_url: avatarUrl,
      };

      if (canChangeRole) {
        updates.role = formData.role;
      }

      const { error } = await supabase
        .from('profiles')
        .upsert(updates);

      if (error) {
        alert("Error saving profile: " + error.message);
      } else {
        alert("Profile saved successfully!");
        setCanChangeRole(false);
        setProfile({ ...profile, ...updates });
      }
    } catch (err) {
      console.error(err);
      alert("Unexpected error saving profile");
    } finally {
      setSaving(false);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = event.target.files?.[0];
      if (!file) return;

      setUploading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}.${fileExt}`;
      const filePath = `/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('profile-pictures')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('profile-pictures')
        .getPublicUrl(filePath);

      const publicUrl = data.publicUrl;

      const { error: dbError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (dbError) throw dbError;

      setAvatarUrl(publicUrl);
      alert('Image uploaded successfully!');
    } catch (error: any) {
      console.error(error);
      alert('Error uploading image: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  if (loading) return (
    <ProtectedRoute>
      <div className="min-h-screen bg-wblue flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    </ProtectedRoute>
  );

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-wblue p-4">
        <div className="top-4 left-4 z-50">
          <button
            onClick={() => {
              if (profile?.role === 'walker') navigate('/walker/dashboard');
              else if (profile?.role === 'owner') navigate('/owner/dashboard');
              else navigate('/');
            }}
            className="fixed top-4 left-4 z-50 bg-wsage/75 backdrop-blur-sm text-black p-2 rounded-full shadow-lg"
          >
            <ChevronLeft size={30} />
          </button>
        </div>

        <div className="max-w-3xl mx-auto mt-8">
          <h1 className="text-3xl font-bold text-white mb-8 text-center">{profile.full_name}</h1>
          <div className="flex flex-col items-center mb-8">
            <div className="relative group w-32 h-32">
              <div className="w-full h-full rounded-full bg-gray-300 border-4 border-white flex items-center justify-center shadow-lg overflow-hidden">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white text-xl">No Image</span>
                )}
              </div>

              {/* Hover Overlay Button */}
              <button
                onClick={handleUploadClick}
                disabled={uploading}
                className="
                  absolute inset-0 flex items-center justify-center
                  bg-black/50 text-white text-sm rounded-full opacity-0
                  group-hover:opacity-100 transition-opacity"
              >
                {uploading ? 'Uploading...' : 'Upload Image'}
              </button>
            </div>

            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          <div className='grid mb-6'>
            <Card>
              <h2 className="font-semibold text-xs text-gray-600 mb-2">Full Name</h2>
              <input
                className="w-full px-3 py-2 bg-white/20 rounded-md focus:outline-none focus:bg-white/60"
                type="text"
                value={formData.full_name}
                onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
              />
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <Card>
              <h2 className="font-semibold text-xs text-gray-600 mb-2">Phone</h2>
              <input
                className="w-full px-3 py-2 bg-white/20 rounded-md focus:outline-none focus:bg-white/60"
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              />
            </Card>

            <Card>
              <h2 className="font-semibold text-xs text-gray-600 mb-2">Email</h2>
              <input
                className="w-full px-3 py-2 bg-white/20 rounded-md focus:outline-none focus:bg-white/60"
                type="email"
                value={formData.email}
                disabled
              />
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {canChangeRole ? (
              <Card>
                <h2 className="font-semibold text-xs text-gray-600 mb-2">Role</h2>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                  className="w-full px-3 py-2 bg-white/20 rounded-md focus:outline-none focus:bg-white/60"
                >
                  <option value="">Select your role</option>
                  <option value="owner">Pet Owner</option>
                  <option value="walker">Dog Walker</option>
                </select>
              </Card>
            ) : (
              <Card>
                <h2 className="font-semibold text-xs text-gray-600 mb-2">Role: cannot be changed once set</h2>
                <div className="w-full px-3 py-2 rounded-md text-black capitalize">
                  {formData.role}
                </div>
              </Card>
            )}

            {formData.role === 'walker' && (
              <>
                <Card>
                  <h2 className="font-semibold text-xs text-gray-600 mb-2">Years of Experience</h2>
                  <input
                    type="number"
                    min="0"
                    value={formData.years_experience}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      years_experience: parseInt(e.target.value) || 0
                    }))}
                    className="w-full px-3 py-2 bg-white/20 rounded-md focus:outline-none focus:bg-white/60"
                  />
                </Card>

                <Card >
                  <h2 className="font-semibold text-xs text-gray-600 mb-2">Bio</h2>
                  <textarea
                    value={formData.bio}
                    onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                    className="w-full px-3 py-2 bg-white/20 rounded-md focus:outline-none focus:bg-white/60"
                    rows={4}
                  />
                </Card>
              </>
            )}
          </div>

          <div className="flex justify-center gap-4">
            {profile?.role === 'owner' && (
              <Button className='mb-6 w-[35%]' onClick={() => navigate('/view-dogs')}>
                Edit Dogs
              </Button>
            )}
            <Button className='mb-6 w-[35%]' onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
