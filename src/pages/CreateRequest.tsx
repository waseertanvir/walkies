import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { supabase } from '../supabaseClient';
import ProtectedRoute from '../auth/ProtectedRoute';
import { Card, Button } from '../components/ui';
import { ChevronLeft } from 'lucide-react';

interface Pet {
  id: string;
  name: string;
  breed: string;
  description: string;
}

export default function CreateRequest() {
  const navigate = useNavigate();
  const [pets, setPets] = useState<Pet[]>([]);
  const [selectedPet, setSelectedPet] = useState<string>('');
  const [formData, setFormData] = useState({
    start_time: '',
    duration_minutes: 30,
    compensation: 0,
    notes: '',
    meeting_location: '',
    special_instructions: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchPets = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('pets')
        .select('*')
        .eq('owner_id', user.id);

      setPets(data || []);
    };

    fetchPets();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPet) return;

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('sessions')
        .insert({
          owner_id: user.id,
          pet_id: selectedPet,
          status: 'pending',
          start_time: formData.start_time,
          duration_minutes: formData.duration_minutes,
          compensation: formData.compensation,
          notes: formData.notes,
          meeting_location: formData.meeting_location,
          special_instructions: formData.special_instructions
        });

      if (error) {
        console.error('Error creating request:', error);
        alert('Error creating request: ' + error.message);
        return;
      }

      alert('Request created successfully!');
      navigate('/');
    } catch (error) {
      console.error('Unexpected error:', error);
      alert('Unexpected error creating request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-wblue p-4 relative">
        <div className="absolute top-4 left-4 z-50">
          <button
            onClick={() => navigate('/')}
            className="bg-wolive text-black p-2 rounded-full shadow-lg hover:bg-green-600 transition-colors"
          >
            <ChevronLeft size={30} />
          </button>
        </div>

        <div className="max-w-2xl mx-auto pt-12">
          <h1 className="text-2xl font-bold text-white mb-6 text-center">
            Create Walk Request
          </h1>

          <Card>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-wblue mb-2">
                  Select Pet
                </label>
                <select
                  value={selectedPet}
                  onChange={(e) => setSelectedPet(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-worange"
                  required
                >
                  <option value="">Choose a pet</option>
                  {pets.map((pet) => (
                    <option key={pet.id} value={pet.id}>
                      {pet.name} ({pet.breed})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-wblue mb-2">
                  Start Time
                </label>
                <input
                  type="datetime-local"
                  value={formData.start_time}
                  onChange={(e) => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-worange"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-wblue mb-2">
                  Duration (minutes)
                </label>
                <input
                  type="number"
                  min="15"
                  max="120"
                  value={formData.duration_minutes}
                  onChange={(e) => setFormData(prev => ({ ...prev, duration_minutes: parseInt(e.target.value) }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-worange"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-wblue mb-2">
                  Compensation ($)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.compensation}
                  onChange={(e) => setFormData(prev => ({ ...prev, compensation: parseFloat(e.target.value) }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-worange"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-wblue mb-2">
                  Meeting Location
                </label>
                <input
                  type="text"
                  value={formData.meeting_location}
                  onChange={(e) => setFormData(prev => ({ ...prev, meeting_location: e.target.value }))}
                  placeholder="Where should the walker meet you?"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-worange"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-wblue mb-2">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Any special instructions for the walker?"
                  rows={3}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-worange"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-wblue mb-2">
                  Special Instructions
                </label>
                <textarea
                  value={formData.special_instructions}
                  onChange={(e) => setFormData(prev => ({ ...prev, special_instructions: e.target.value }))}
                  placeholder="Any specific requirements or restrictions?"
                  rows={2}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-worange"
                />
              </div>

              <div className="flex gap-4 pt-4">
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? 'Creating...' : 'Create Request'}
                </Button>
                <Button type="button" variant="secondary" onClick={() => navigate('/')}>
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  );
}
