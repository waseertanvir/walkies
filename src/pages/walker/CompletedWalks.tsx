import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { ChevronLeft } from "lucide-react";
import ProtectedRoute from "../../auth/ProtectedRoute";
import { Card, Button } from "../../components/ui";
import { supabase } from "../../supabaseClient";
import { WalkStatus } from "../../constants/WalkStatus";

interface Session {
  id: string;
  status: string;
  start_time: string;
  end_time: string | null;
  duration_minutes: number;
  compensation: number;
  pet_id: string;
  owner_id: string;
  created_at: string;
}

interface Pet {
  id: string;
  name: string;
  breed: string;
}

interface OwnerProfile {
  id: string;
  full_name: string;
}

export default function CompletedWalks() {
  const navigate = useNavigate();
  const [walks, setWalks] = useState<Session[]>([]);
  const [pets, setPets] = useState<Record<string, Pet>>({});
  const [owners, setOwners] = useState<Record<string, OwnerProfile>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCompletedWalks = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
          .from('sessions')
          .select('*')
          .eq('walker_id', user.id)
          .eq('status', WalkStatus.Completed)
          .order('end_time', { ascending: false });

        setWalks(data || []);

        // Fetch pets and owners data
        if (data && data.length > 0) {
          const petIds = data.map(walk => walk.pet_id);
          const ownerIds = data.map(walk => walk.owner_id);

          const { data: petsData } = await supabase
            .from('pets')
            .select('id, name, breed')
            .in('id', petIds);

          const { data: ownersData } = await supabase
            .from('profiles')
            .select('id, full_name')
            .in('id', ownerIds);

          const petsMap: Record<string, Pet> = {};
          petsData?.forEach(pet => {
            petsMap[pet.id] = pet;
          });
          setPets(petsMap);

          const ownersMap: Record<string, OwnerProfile> = {};
          ownersData?.forEach(owner => {
            ownersMap[owner.id] = owner;
          });
          setOwners(ownersMap);
        }
      } catch (error) {
        console.error('Error fetching completed walks:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCompletedWalks();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleViewDetails = (sessionId: string) => {
    navigate(`/walk-history/${sessionId}`);
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-wsage flex items-center justify-center">
          <div className="text-white text-xl">Loading completed walks...</div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-wsage p-4">
        <div className="absolute top-4 left-4 z-50">
          <button
            onClick={() => navigate(-1)}
            className="fixed top-4 left-4 z-50 bg-wolive text-black p-2 rounded-full shadow-lg hover:bg-green-600 transition"
          >
            <ChevronLeft size={30} />
          </button>
        </div>

        <div className="max-w-6xl mx-auto mt-16">
          <h1 className="text-3xl font-bold text-white mb-6 text-center">
            Completed Walks
          </h1>

          {walks.length === 0 ? (
            <Card>
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-wyellow rounded-full flex items-center justify-center text-white text-2xl mx-auto mb-4">
                  🐕
                </div>
                <h3 className="text-lg font-semibold text-wblue mb-2">No Completed Walks Yet</h3>
                <p className="text-gray-600">You haven't completed any walks yet.</p>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {walks.map((walk) => (
                <Card
                  key={walk.id}
                  className="bg-[#D9D9D9] p-4 rounded-2xl shadow-md flex flex-col items-center text-center hover:shadow-lg transition-shadow"
                >
                  <div className="w-24 h-24 rounded-full bg-gray-300 border border-gray-400 mb-3"></div>
                  <h2 className="text-xl font-semibold text-wblue mb-1">
                    {pets[walk.pet_id]?.name || 'Unknown Pet'}
                  </h2>
                  <p className="text-gray-700 text-sm mb-1">
                    Owner: {owners[walk.owner_id]?.full_name || 'Unknown Owner'}
                  </p>
                  <p className="text-gray-600 text-sm mb-3">
                    {walk.end_time ? formatDate(walk.end_time) : formatDate(walk.start_time)} • {walk.end_time ? formatTime(walk.end_time) : formatTime(walk.start_time)}
                  </p>
                  <Button
                    onClick={() => handleViewDetails(walk.id)}
                    size="sm"
                    variant="secondary"
                  >
                    View Details
                  </Button>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
