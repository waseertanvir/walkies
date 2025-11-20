import { useState, useEffect } from 'react';
import ProtectedRoute from '../../auth/ProtectedRoute.tsx';
import { supabase } from '../../supabaseClient.ts';
import WalkerMenu from '../../components/walkerMenu.tsx';
import { Card, Button, StatusPill } from '../../components/ui';
import { useNavigate } from 'react-router';
import '../../pages/App.css';
import { WalkStatus } from '../../constants/WalkStatus.tsx';

export interface Walk {
  id: string;
  owner_id: string;
  walker_id: string | null;
  pet_id: string;
  status: WalkStatus;
  start_time: string;
  duration_minutes: number;
  notes: string | null;
  compensation: number;
  meeting_location: string | null;
  special_instructions: string | null;
  created_at: string;
  updated_at: string;
  applications: string[] | null;
  pets?: {
    name: string;
  };
}

type UserLocation = {
  userID: string,
  role: string,
  name: string,
  position: { lat: number; lng: number },
  timestamp: Date,
};

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
        .select('*, pets ( name )')
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
        hasStarted: new Date(walk.start_time) <= now && walk.status !== WalkStatus.Completed
      })) as (Walk & { hasStarted: boolean })[];


      // const updateUserLocation = (updateLocation: UserLocation) => {
      //   console.log(updateLocation)
      //   setUsers(prevUsers => {
      //     const index = prevUsers.findIndex(u => u.userID === updateLocation.userID);

      //     if (index !== -1) {
      //       // Update existing user
      //       const updatedUsers = [...prevUsers];
      //       updatedUsers[index] = { ...updatedUsers[index], ...updateLocation };
      //       return updatedUsers;
      //     } else {
      //       // Add new user
      //       return [...prevUsers, updateLocation];
      //     }
      //   });
      // };

      // const channel = supabase
      //   .channel("liveLocations")
      //   .on('broadcast', { event: "location" }, (payload) => {
      //     console.log('received payload: ', payload.payload, '\n\n')
      //     const tempUserLocation: UserLocation = {
      //       userID: payload.payload.userID,
      //       role: payload.payload.role,
      //       name: payload.payload.name,
      //       position: payload.payload.position,
      //       timestamp: payload.payload.timestamp,
      //     }
      //     updateUserLocation(tempUserLocation)
      //   })
      //   .subscribe();

      // if (navigator.geolocation) {
      //   navigator.geolocation.getCurrentPosition(
      //     (position) => {
      //       setMyPosition({
      //         lat: position.coords.latitude,
      //         lng: position.coords.longitude
      //       });
      //     },
      //     (error) => {
      //       console.error("Error getting location: ", error);
      //     }
      //   );
      // }

      // const sendLocation = async (updatedPosition: any) => {
      //   //broadcast user position to realtime
      //   await supabase
      //     .channel("liveLocations")
      //     .send({
      //       type: "broadcast",
      //       event: "location",
      //       payload: {
      //         userID: userID,
      //         role: userRole,
      //         name: userName,
      //         position: updatedPosition,
      //         timestamp: new Date().toISOString(),
      //       },
      //     });
      // }

      setWalks(walksWithFlags);
      setLoading(false);
    };

    fetchData();
  }, []);

  async function handleAccept(sessionId: string): Promise<void> {
    const { error } = await supabase
      .from("sessions")
      .update({ status: WalkStatus.Accepted })
      .eq("id", sessionId);

    if (error) {
      console.error("Failed to update session:", error);
      return;
    }

    // Update walks array locally
    setWalks(prev =>
      prev.map(w =>
        w.id === sessionId
          ? { ...w, status: WalkStatus.Accepted }
          : w
      )
    );
  }

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
                className={`bg-[#D9D9D9] p-4 hover:shadow-lg transition flex flex-col items-center text-center rounded-2xl ${(walk as any).hasStarted ? 'border-4 border-green-500' : ''
                  }`}
              >
                <h2 className="text-xl font-semibold text-wblue mb-1">
                  Dog: {walk.pets?.name}
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
                {walk.status == 'pending' ? (
                  <Button children={'Accept'} onClick={() => {void handleAccept(walk.id);}}></Button>
                ) : (<Button children={'Track'} onClick={() => navigate(`/track/${walk.id}`)}></Button>)}
              </Card>
            ))}
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
