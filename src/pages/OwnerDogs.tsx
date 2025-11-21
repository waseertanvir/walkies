import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { supabase } from '../supabaseClient';
import ProtectedRoute from '../auth/ProtectedRoute';
import { Card, Button } from '../components/ui';
import { ChevronLeft, X, Upload } from 'lucide-react';

interface Dog {
  id: string;
  owner_id: string;
  name: string;
  breed: string;
  description?: string;
  avatar_url?: string;
  created_at?: string;
}

export default function OwnerDogs() {
  const navigate = useNavigate();
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDogModal, setShowDogModal] = useState(false);
  const [selectedDog, setSelectedDog] = useState<Dog | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [savingDog, setSavingDog] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dogForm, setDogForm] = useState({
    name: '',
    breed: '',
    description: '',
    avatar_url: '',
  });

  useEffect(() => {
    const fetchDogs = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('pets')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      if (error) console.error('Error fetching dogs:', error.message);
      setDogs(data || []);
      setLoading(false);
    };

    fetchDogs();
  }, []);

  const handleInputChange = (field: string, value: string) => {
    setDogForm(prev => ({ ...prev, [field]: value }));
  };

  const handleCardClick = (dog: Dog) => {
    setSelectedDog(dog);
    setDogForm({
      name: dog.name,
      breed: dog.breed,
      description: dog.description || '',
      avatar_url: dog.avatar_url || '',
    });
    setShowDogModal(true);
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('profile-pictures')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('profile-pictures')
        .getPublicUrl(filePath);

      setDogForm(prev => ({ ...prev, avatar_url: publicUrlData.publicUrl }));
    } catch (error: any) {
      alert('Error uploading image: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const saveDog = async () => {
    const { name, breed, description, avatar_url } = dogForm;
    if (!name || !breed) {
      alert('Please enter both name and breed');
      return;
    }

    setSavingDog(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from('pets').insert({
        owner_id: user.id,
        name,
        breed,
        description: description || null,
        avatar_url: avatar_url || null,
      });

      if (error) throw error;

      const { data } = await supabase
        .from('pets')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      setDogs(data || []);
      setDogForm({ name: '', breed: '', description: '', avatar_url: '' });
      setShowAddModal(false);
    } catch (error: any) {
      console.error('Error adding dog:', error.message);
      alert('Error adding dog: ' + error.message);
    } finally {
      setSavingDog(false);
    }
  };

  const handleSaveChanges = async () => {
    if (!selectedDog) return;
    setSavingDog(true);

    try {
      const { error } = await supabase
        .from('pets')
        .update({
          name: dogForm.name,
          breed: dogForm.breed,
          description: dogForm.description,
          avatar_url: dogForm.avatar_url,
        })
        .eq('id', selectedDog.id);

      if (error) throw error;

      const { data } = await supabase
        .from('pets')
        .select('*')
        .eq('owner_id', selectedDog.owner_id)
        .order('created_at', { ascending: false });

      setDogs(data || []);
      setShowDogModal(false);
    } catch (error: any) {
      console.error('Error updating dog:', error.message);
      alert('Error updating dog: ' + error.message);
    } finally {
      setSavingDog(false);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-wblue flex items-center justify-center text-white text-xl">
          Loading...
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-wblue p-4 relative overflow-hidden">
        <button
          onClick={() => navigate(-1)}
          className="fixed top-4 left-4 z-50 bg-wsage/75 backdrop-blur-sm text-black p-2 rounded-full shadow-lg"
        >
          <ChevronLeft size={30} />
        </button>
        <div className="max-w-3xl mx-auto mt-8">
          <h1 className="text-3xl font-bold text-white mb-8 text-center">Your Dogs</h1>
          {dogs.length === 0 ? (
            <p className="text-white text-center mt-8">You have no dogs added yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {dogs.map(dog => (
                <Card
                  key={dog.id}
                  className="bg-[#D9D9D9] p-4 cursor-pointer hover:shadow-lg transition"
                  onClick={() => handleCardClick(dog)}
                >
                  <div className='flex items-center'>
                    {dog.avatar_url ? (
                      <img
                        src={dog.avatar_url}
                        alt={dog.name}
                        className="w-28 h-28 mx-auto rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-28 h-28 mx-auto rounded-full bg-gray-400 flex items-center justify-center text-white text-3xl font-bold">
                        {dog.name[0]}
                      </div>
                    )}
                    <div className='w-[65%] px-4 flex flex-col items-center'>
                      <h2 className="text-xl font-semibold text-wblue text-center mb-1">
                        {dog.name}
                      </h2>
                      <div>
                      <p className="text-sm text-gray-700 pt-1 mb-1">
                        <strong>Breed:</strong> {dog.breed}
                      </p>
                      <p className="text-sm text-gray-700 pt-1">
                        <strong>Description:</strong> {dog.description}
                      </p>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
          <div className="flex justify-center items-center w-full mt-8">
            <Button onClick={() => setShowAddModal(true)}>Add Dog</Button>
          </div>
        </div>

        {showDogModal && selectedDog && (
          <div className="fixed inset-0 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="bg-wolive p-6 rounded-xl shadow-xl w-full max-w-md relative border border-gray-300">
              <button
                className="absolute top-3 right-3 hover:text-gray-600"
                onClick={() => setShowDogModal(false)}
              >
                <X size={24} />
              </button>

              <div className="flex flex-col items-center text-center space-y-3">
                <div className="relative group w-28 h-28">
                  {dogForm.avatar_url ? (
                    <img
                      src={dogForm.avatar_url}
                      alt={dogForm.name}
                      className="w-full h-full rounded-full object-cover border border-white shadow-md"
                    />
                  ) : (
                    <div className="w-full h-full rounded-full bg-gray-300 flex items-center justify-center border border-white shadow-md text-white text-xl font-bold">
                      {dogForm.name ? dogForm.name[0] : '?'}
                    </div>
                  )}

                  {/* Hover overlay upload button */}
                  <label
                    className="
        absolute inset-0 flex flex-col items-center justify-center
        bg-black/50 rounded-full text-white text-sm gap-1 cursor-pointer
        opacity-0 group-hover:opacity-100 transition-opacity
      "
                  >
                    <Upload size={18} />
                    <span>{uploading ? 'Uploading...' : 'Upload Image'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                <input
                  type="text"
                  value={dogForm.name}
                  onChange={e => handleInputChange('name', e.target.value)}
                  className="w-full px-3 py-2 bg-white/20 rounded-md focus:outline-none focus:bg-white/60"
                  placeholder="Dog's Name"
                />

                <input
                  type="text"
                  value={dogForm.breed}
                  onChange={e => handleInputChange('breed', e.target.value)}
                  className="w-full px-3 py-2 bg-white/20 rounded-md focus:outline-none focus:bg-white/60"
                  placeholder="Breed"
                />

                <textarea
                  value={dogForm.description}
                  onChange={e => handleInputChange('description', e.target.value)}
                  className="w-full px-3 py-2 bg-white/20 rounded-md focus:outline-none focus:bg-white/60"
                  placeholder="Description"
                />

                <Button className='w-[35%]' onClick={handleSaveChanges} disabled={savingDog}>
                  {savingDog ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {showAddModal && (
          <div className="fixed inset-0 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="bg-wolive p-6 rounded-xl shadow-xl w-full max-w-md relative border border-gray-300">
              <button
                className="absolute top-3 right-3 hover:text-gray-600"
                onClick={() => setShowAddModal(false)}
              >
                <X size={24} />
              </button>

              <h2 className="text-xl font-bold mb-4 text-wblue text-center">Add New Dog</h2>

              <div className="flex flex-col items-center text-center space-y-3">
                {/* Avatar + hover upload overlay */}
                <div className="relative group w-28 h-28">
                  {dogForm.avatar_url ? (
                    <img
                      src={dogForm.avatar_url}
                      alt={dogForm.name}
                      className="w-full h-full rounded-full object-cover border border-white shadow-md"
                    />
                  ) : (
                    <div className="w-full h-full rounded-full bg-gray-300 flex items-center justify-center border border-white shadow-md text-white text-xl font-bold">
                      ?
                    </div>
                  )}

                  <label
                    className="
              absolute inset-0 flex flex-col items-center justify-center
              bg-black/50 rounded-full text-white text-sm gap-1 cursor-pointer
              opacity-0 group-hover:opacity-100 transition-opacity
            "
                  >
                    <Upload size={18} />
                    <span>{uploading ? 'Uploading...' : 'Upload Image'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Form fields with ONLY placeholders */}
                <div className="w-full">
                  <input
                    type="text"
                    value={dogForm.name}
                    onChange={e => handleInputChange('name', e.target.value)}
                    className="w-full px-3 py-2 bg-white/20 rounded-md focus:outline-none focus:bg-white/60"
                    placeholder="Dog's name"
                  />
                </div>

                <div className="w-full">
                  <input
                    type="text"
                    value={dogForm.breed}
                    onChange={e => handleInputChange('breed', e.target.value)}
                    className="w-full px-3 py-2 bg-white/20 rounded-md focus:outline-none focus:bg-white/60"
                    placeholder="Breed"
                  />
                </div>

                <div className="w-full">
                  <input
                    type="text"
                    value={dogForm.description}
                    onChange={e => handleInputChange('description', e.target.value)}
                    className="w-full px-3 py-2 bg-white/20 rounded-md focus:outline-none focus:bg-white/60"
                    placeholder="Description (optional)"
                  />
                </div>

                <Button onClick={saveDog} disabled={savingDog} className="mt-2">
                  {savingDog ? 'Saving...' : 'Add Dog'}
                </Button>
              </div>
            </div>
          </div>
        )}

      </div>
    </ProtectedRoute>
  );
}
