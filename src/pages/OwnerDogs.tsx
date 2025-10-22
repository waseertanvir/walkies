import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { supabase } from '../supabaseClient';
import ProtectedRoute from '../auth/ProtectedRoute';
import { Card, Button } from '../components/ui';
import { ChevronLeft, X } from 'lucide-react';

interface Dog {
  id: string;
  name: string;
  breed: string;
  description?: string;
}

export default function OwnerDogs() {
  const navigate = useNavigate();
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [savingDog, setSavingDog] = useState(false);
  const [dogForm, setDogForm] = useState({ name: '', breed: '', description: '' });

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

  const saveDog = async () => {
    const { name, breed, description } = dogForm;
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
      });

      if (error) throw error;

      const { data } = await supabase
        .from('pets')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      setDogs(data || []);
      setDogForm({ name: '', breed: '', description: '' });
      setShowModal(false);
    } catch (error: any) {
      console.error('Error adding dog:', error.message);
      alert('Error adding dog: ' + error.message);
    } finally {
      setSavingDog(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setDogForm(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-[#619B8A] flex items-center justify-center text-white text-xl">
          Loading...
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#619B8A] p-4 relative">
        <button
          onClick={() => navigate('/userprofile')}
          className="absolute top-4 left-4 bg-wolive text-black p-2 rounded-full shadow-lg hover:bg-green-600 transition"
        >
          <ChevronLeft size={30} />
        </button>

        <div className="max-w-4xl mx-auto mt-16">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-white">Your Dogs</h1>
            <Button onClick={() => setShowModal(true)}>Add Dog</Button>
          </div>

          {dogs.length === 0 ? (
            <p className="text-white text-center mt-8">You have no dogs added yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {dogs.map(dog => (
                <Card
                  key={dog.id}
                  className="bg-[#D9D9D9] p-4 cursor-pointer hover:shadow-lg transition"
                  onClick={() => navigate(`/dog/${dog.id}`)}
                >
                  <h2 className="text-xl font-semibold text-wblue mb-1 text-center">
                    {dog.name}
                  </h2>
                  <p className="text-sm text-gray-700 text-center mb-1">
                    <strong>Breed:</strong> {dog.breed}
                  </p>
                  {dog.description && (
                    <p className="text-sm text-gray-600 text-center">{dog.description}</p>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>

        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-[#D9D9D9] p-6 rounded-lg w-full max-w-md relative">
              <button
                className="absolute top-3 right-3 hover:text-gray-600"
                onClick={() => setShowModal(false)}
              >
                <X size={24} />
              </button>

              <h2 className="text-xl font-bold mb-4 text-wblue">Add New Dog</h2>
              <div className="space-y-3">
                {['name', 'breed', 'description'].map(field => (
                  <div key={field}>
                    <label className="block text-sm font-medium text-wblue mb-1 capitalize">
                      {field}
                    </label>
                    {field === 'description' ? (
                      <textarea
                        value={dogForm[field as keyof typeof dogForm]}
                        onChange={e => handleInputChange(field, e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-wblue"
                        rows={3}
                        placeholder="Description (optional)"
                      />
                    ) : (
                      <input
                        type="text"
                        value={dogForm[field as keyof typeof dogForm]}
                        onChange={e => handleInputChange(field, e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-wblue"
                        placeholder={field === 'name' ? "Dog's name" : 'Breed'}
                      />
                    )}
                  </div>
                ))}

                <Button onClick={saveDog} disabled={savingDog}>
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
