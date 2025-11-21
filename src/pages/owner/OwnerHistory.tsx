import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { supabase } from '../../supabaseClient';
import ProtectedRoute from '../../auth/ProtectedRoute';
import { Card } from '../../components/ui';
import { ChevronLeft } from 'lucide-react';
import { WalkStatus } from '../../constants/WalkStatus';

interface Session {
  id: string;
  status: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  compensation: number;
  notes: string;
  meeting_location: string;
  special_instructions: string;
  walker_id: string | null;
  pet_id: string;
  owner_id: string;
  created_at: string;
}

interface Dog {
  id: string;
  owner_id: string;
  name: string;
  breed: string;
  description?: string;
  avatar_url?: string;
  created_at?: string;
}

interface WalkerProfile {
  id: string;
  full_name: string;
}

export default function OwnerHistory() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [pets, setPets] = useState<Record<string, Dog>>({});
  const [walkers, setWalkers] = useState<Record<string, WalkerProfile>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCompletedWalks = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from('sessions')
          .select('*')
          .eq('owner_id', user.id)
          .eq('status', WalkStatus.Completed)
          .order('end_time', { ascending: false });

        if (error) {
          console.error('Error fetching completed walks:', error);
          console.log('Error code:', error.code);
          console.log('Error message:', error.message);
        } else {
          console.log(`Found ${data?.length || 0} completed walks`);
          console.log('WalkStatus.Completed value:', WalkStatus.Completed);
        }

        setSessions(data || []);

        if (data && data.length > 0) {
          const petIds = data.map(session => session.pet_id);
          const { data: petsData } = await supabase
            .from('pets')
            .select('id, owner_id, name, breed, description, avatar_url, created_at')
            .in('id', petIds);

          const petsMap: Record<string, Dog> = {};
          petsData?.forEach(pet => {
            petsMap[pet.id] = pet as Dog;
          });
          setPets(petsMap);

          const walkerIds = data
            .filter(session => session.walker_id)
            .map(session => session.walker_id!);

          if (walkerIds.length > 0) {
            const { data: walkersData } = await supabase
              .from('profiles')
              .select('id, full_name')
              .in('id', walkerIds);

            const walkersMap: Record<string, WalkerProfile> = {};
            walkersData?.forEach(walker => {
              walkersMap[walker.id] = walker;
            });
            setWalkers(walkersMap);
          }
        }
      } catch (error) {
        console.error('Error fetching completed walks:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCompletedWalks();
  }, []);

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const handleViewDetails = (sessionId: string) => {
    navigate(`/walk-history/${sessionId}`);
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-wblue flex items-center justify-center text-white text-xl">
          Loading walk history...
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
          <h1 className="text-3xl font-bold text-white mb-8 text-center">
            Walk History
          </h1>
          {sessions.length === 0 ? (
            <p className="text-white text-center mt-8">
              You haven't completed any walks yet.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sessions.map(session => {
                const pet = pets[session.pet_id];
                const walker = session.walker_id
                  ? walkers[session.walker_id]
                  : undefined;

                return (
                  <Card
                    key={session.id}
                    className="bg-[#D9D9D9] p-4 cursor-pointer hover:shadow-lg transition"
                    onClick={() => handleViewDetails(session.id)}
                  >
                    <div className="flex items-center">
                      {pet?.avatar_url ? (
                        <img
                          src={pet.avatar_url}
                          alt={pet.name}
                          className="w-28 h-28 mx-auto rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-28 h-28 mx-auto rounded-full bg-gray-400 flex items-center justify-center text-white text-3xl font-bold">
                          {pet?.name ? pet.name[0] : '?'}
                        </div>
                      )}
                      <div className="w-[65%] px-4">
                        <h2 className="text-xl font-semibold text-wblue text-center mb-1">
                          {pet ? pet.name : 'Unknown Pet'}
                        </h2>
                        <p className="text-sm text-gray-700 pt-1">
                          <strong>Date:</strong>{' '}
                          {formatDate(session.end_time)}
                        </p>
                        <p className="text-sm text-gray-700 pt-1">
                          <strong>Compensation:</strong> ${session.compensation}
                        </p>
                        <p className="text-sm text-gray-700 pt-1">
                          <strong>Walker:</strong>{' '}
                          {walker ? walker.full_name : 'Not assigned'}
                        </p>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
