import { useState, useEffect } from 'react';
import ProtectedRoute from '../../auth/ProtectedRoute.tsx';
import { supabase } from '../../supabaseClient.ts';
import WalkerMenu from '../../components/walkerMenu.tsx';
import { Card, Button, StatusPill } from '../../components/ui';
import { useNavigate } from 'react-router';
import '../../pages/App.css';

interface Walk {
  id: string;
  dog_name: string;
  dog_photo_url?: string;
  date: string;
  time: string;
  status: string;
  owner_name?: string;
  duration_minutes?: number;
  owners?: { full_name: string };
}

export default function WalkerDashboard() {
  const [username, setUsername] = useState('');
  const [walks, setWalks] = useState<Walk[]>([]);
  const [activeWalk, setActiveWalk] = useState<Walk | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();

      setUsername(profile?.full_name || 'Walker');

      const { data, error } = await supabase
        .from('walks')
        .select(`
          *,
          owners:profiles!walks_owner_id_fkey(full_name)
        `)
        .eq('walker_id', user.id)
        .order('date', { ascending: false });

      if (error) console.error('Error fetching walks:', error.message);
      const walksData: Walk[] = data || [];

      const mappedWalks = walksData.map((walk) => ({
        ...walk,
        owner_name: walk.owners?.full_name || 'Unknown',
      }));

      setWalks(mappedWalks);

      const currentWalk = mappedWalks.find(
        (walk) => walk.status === 'Accepted' || walk.status === 'In Progress'
      );

      if (currentWalk) {
        setActiveWalk(currentWalk);
      }

      setLoading(false);
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-[#619B8A] flex items-center justify-center text-white text-xl">
          Loading Dashboard...
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <WalkerMenu />

      <div className="min-h-screen bg-[#619B8A] p-4 pt-20 flex flex-col items-center">
        <h1 className="text-3xl font-bold text-white mb-6">
          Welcome, {username}
        </h1>

        {activeWalk && (
          <Card className="mb-6 border-l-4 border-worange w-full max-w-md">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold text-wblue mb-2">Current Walk</h3>
                <p className="text-sm text-gray-600 mb-1">
                  Owner: {activeWalk.owner_name || 'Unknown'}
                </p>
                <p className="text-sm text-gray-600">Dog: {activeWalk.dog_name}</p>
                <p className="text-sm text-gray-600">
                  Duration: {activeWalk.duration_minutes || 30} minutes
                </p>
                <p className="text-sm text-gray-600">
                  Date: {activeWalk.date} • Time: {activeWalk.time}
                </p>
              </div>
              <div className="text-right">
                <StatusPill status={activeWalk.status} className="mb-2" />
                <Button
                  size="sm"
                  onClick={() => navigate(`/track/${activeWalk.id}`)}
                >
                  Track
                </Button>
              </div>
            </div>
          </Card>
        )}

        <Button className="mb-8" onClick={() => navigate('/requests')}>
          Find Walks
        </Button>

        {walks.length === 0 ? (
          <p className="text-white text-center mt-8">
            You have no assigned walks yet.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl w-full">
            {walks.map((walk) => (
              <Card
                key={walk.id}
                className="bg-[#D9D9D9] p-4 hover:shadow-lg transition flex flex-col items-center text-center rounded-2xl"
              >
                <div className="w-24 h-24 rounded-full bg-gray-300 flex items-center justify-center mb-3 overflow-hidden border border-gray-400">
                  {walk.dog_photo_url ? (
                    <img
                      src={walk.dog_photo_url}
                      alt={walk.dog_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-white text-xl font-bold">
                      {walk.dog_name[0]}
                    </span>
                  )}
                </div>

                <h2 className="text-xl font-semibold text-wblue mb-1">
                  {walk.dog_name}
                </h2>

                <p className="text-gray-700 text-sm mb-2">
                  {walk.date} • {walk.time}
                </p>

                <p className="text-gray-700 text-sm mb-2">
                  Owner: {walk.owner_name}
                </p>

                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    walk.status === 'Accepted'
                      ? 'bg-green-300 text-green-800'
                      : 'bg-yellow-300 text-yellow-800'
                  }`}
                >
                  {walk.status}
                </span>
              </Card>
            ))}
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
