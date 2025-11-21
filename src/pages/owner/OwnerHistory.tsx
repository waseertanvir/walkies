import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { supabase } from '../../supabaseClient';
import ProtectedRoute from '../../auth/ProtectedRoute';
import { Card, Button, StatusPill } from '../../components/ui';
import { ChevronLeft } from 'lucide-react';
import { WalkStatus } from '../../constants/WalkStatus';

interface Session {
  id: string;
  status: string;
  start_time: string;
  end_time: string | null;
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

interface Pet {
  id: string;
  name: string;
  breed: string;
}

interface WalkerProfile {
  id: string;
  full_name: string;
}

export default function OwnerHistory() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [pets, setPets] = useState<Record<string, Pet>>({});
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

        // Fetch pets data
        if (data && data.length > 0) {
          const petIds = data.map(session => session.pet_id);
          const { data: petsData } = await supabase
            .from('pets')
            .select('id, name, breed')
            .in('id', petIds);

          const petsMap: Record<string, Pet> = {};
          petsData?.forEach(pet => {
            petsMap[pet.id] = pet;
          });
          setPets(petsMap);

          // Fetch walkers data
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
        <div className="min-h-screen bg-wblue flex items-center justify-center">
          <div className="text-white text-xl">Loading walk history...</div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-wblue p-4">
        <div className="max-w-4xl mx-auto">
          <div className="relative mb-6">
            <button
              onClick={() => navigate('/owner/dashboard')}
              className="fixed top-4 left-4 z-50 bg-wsage/75 backdrop-blur-sm text-black p-2 rounded-full shadow-lg"
            >
              <ChevronLeft size={30} />
            </button>
            <div className="flex justify-center">
              <h1 className="text-2xl font-bold text-white text-center mt-2">Walk History</h1>
            </div>
          </div>

          {sessions.length === 0 ? (
            <Card>
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-wyellow rounded-full flex items-center justify-center text-white text-2xl mx-auto mb-4">
                  🐕
                </div>
                <h3 className="text-lg font-semibold text-wblue mb-2">No Completed Walks Yet</h3>
                <p className="text-gray-600 mb-4">You haven't completed any walks yet.</p>
              </div>
            </Card>
          ) : (
            <div className="space-y-4">
              {sessions.map((session) => (
                <Card key={session.id} className="hover:shadow-lg transition-shadow">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-semibold text-wblue">
                          {pets[session.pet_id]?.name} ({pets[session.pet_id]?.breed})
                        </h3>
                        <StatusPill status={session.status} />
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Date:</span> {session.end_time ? formatDate(session.end_time) : formatDate(session.start_time)}
                          </p>
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Duration:</span> {session.duration_minutes} minutes
                          </p>
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Compensation:</span> ${session.compensation}
                          </p>
                        </div>
                        <div>
                          {session.walker_id && walkers[session.walker_id] ? (
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">Walker:</span> {walkers[session.walker_id].full_name}
                            </p>
                          ) : (
                            <p className="text-sm text-gray-500">
                              <span className="font-medium">Walker:</span> Not assigned
                            </p>
                          )}
                          {session.meeting_location && (
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">Location:</span> {session.meeting_location}
                            </p>
                          )}
                          {session.end_time && (
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">Completed:</span> {formatDateTime(session.end_time)}
                            </p>
                          )}
                        </div>
                      </div>

                      {session.notes && (
                        <div className="mb-3">
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Notes:</span> {session.notes}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="ml-4 flex flex-col space-y-2">
                      <Button
                        onClick={() => handleViewDetails(session.id)}
                        size="sm"
                        variant="secondary"
                      >
                        View Details
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}

