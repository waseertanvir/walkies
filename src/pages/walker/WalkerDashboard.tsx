import { useState, useEffect } from 'react';
import ProtectedRoute from '../../auth/ProtectedRoute.tsx';
import { supabase } from '../../supabaseClient.ts';
import WalkerMenu from '../../components/walkerMenu.tsx';
import { Card, Button, StatusPill } from '../../components/ui';
import { useNavigate } from 'react-router';
import '../../pages/App.css';

export interface Walk {
  id: string;
  owner_id: string;
  walker_id: string | null;
  pet_id: string;
  status: 'draft' | 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
  start_time: string; 
  duration_minutes: number;
  notes: string | null;
  compensation: number;
  meeting_location: string | null;
  special_instructions: string | null;
  created_at: string; 
  updated_at: string; 
  applications: string[] | null;
}

export default function WalkerDashboard() {
  const [username, setUsername] = useState('');
  const [walks, setWalks] = useState<Walk[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();

      setUsername(profile?.full_name || 'Walker');

      // Fetch all sessions assigned to walker
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('walker_id', user.id)
        .order('start_time', { ascending: false });

      if (error) {
        console.error('Error fetching walks:', error.message);
        setLoading(false);
        return;
      }

      const now = new Date();

      const walksWithFlags = (data || []).map((walk: Walk) => ({
        ...walk,
        hasStarted: new Date(walk.start_time) <= now && walk.status !== 'completed'
      })) as (Walk & { hasStarted: boolean })[];

      setWalks(walksWithFlags);
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
                className={`bg-[#D9D9D9] p-4 hover:shadow-lg transition flex flex-col items-center text-center rounded-2xl ${
                  (walk as any).hasStarted ? 'border-4 border-green-500' : ''
                }`}
              >
                <h2 className="text-xl font-semibold text-wblue mb-1">
                  Dog: {walk.pet_id}
                </h2>

                <p className="text-gray-700 text-sm mb-2">
                  Start: {new Date(walk.start_time).toLocaleString()}
                </p>

                <p className="text-gray-700 text-sm mb-2">
                  Duration: {walk.duration_minutes} minutes
                </p>

                <p className="text-gray-700 text-sm mb-2">
                  Compensation: ${walk.compensation}
                </p>

                <StatusPill status={walk.status} />
                <Button children={'Track'} onClick={() => navigate(`/track/${walk.id}`)}></Button>
              </Card>
            ))}
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
