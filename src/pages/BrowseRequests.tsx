import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { supabase } from '../supabaseClient';
import ProtectedRoute from '../auth/ProtectedRoute';
import { Card, Button, StatusPill } from '../components/ui';
import { WalkStatus } from '../constants/WalkStatus';
import { SessionType } from '../constants/SessionType';
import { ChevronLeft } from 'lucide-react';

interface Request {
  id: string;
  status: string;
  start_time: string;
  duration_minutes: number;
  compensation: number;
  notes: string;
  meeting_location: string;
  special_instructions: string;
  applications: string[];
  walker_id: string | null;
  pet_id: string;
  owner_id: string;
  created_at: string;
}

interface Pet {
  id: string;
  name: string;
  breed: string;
  description: string;
}

interface OwnerProfile {
  id: string;
  full_name: string;
}

export default function BrowseRequests() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState<Request[]>([]);
  const [pets, setPets] = useState<Record<string, Pet>>({});
  const [owners, setOwners] = useState<Record<string, OwnerProfile>>({});
  const [loading, setLoading] = useState(true);
  const [applyingTo, setApplyingTo] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const fetchRequests = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
      }

      const { data } = await supabase
        .from('sessions')
        .select('*')
        .eq('status', WalkStatus.Pending)
        .order('created_at', { ascending: false });

      console.log('BrowseRequests - Raw sessions data:', data);
      console.log('BrowseRequests - Data length:', data?.length);
      console.log('BrowseRequests - First session applications:', data?.[0]?.applications);
      console.log('BrowseRequests - First session applications type:', typeof data?.[0]?.applications);
      console.log('BrowseRequests - First session applications is array:', Array.isArray(data?.[0]?.applications));
      setRequests(data || []);

      if (data && data.length > 0) {
        const petIds = data.map(request => request.pet_id);
        const ownerIds = data.map(request => request.owner_id);

        const { data: petsData } = await supabase
          .from('pets')
          .select('id, name, breed, description')
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
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleApply = async (requestId: string) => {
    setApplyingTo(requestId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: session } = await supabase
        .from('sessions')
        .select('applications, type')
        .eq('id', requestId)
        .single();

      console.log('Current session data:', session);
      console.log('User ID:', user.id);
      console.log('Session ID:', requestId);

      if (!session) {
        alert('Session not found');
        return;
      }

      console.log('Session applications before update:', session.applications);
      console.log('Session applications type:', typeof session.applications);
      console.log('Session applications is array:', Array.isArray(session.applications));

      if (session.applications && session.applications.includes(user.id)) {
        alert('You have already applied to this session');
        setApplyingTo(null);
        return;
      }

      const currentApplications = session.applications || [];
      const updatedApplications = [...currentApplications, user.id];

      console.log('Current applications:', currentApplications);
      console.log('Updated applications:', updatedApplications);
      console.log('Updated applications JSON:', JSON.stringify(updatedApplications));

      if (session.type == SessionType.Scheduled) {
        const { error } = await supabase
          .from('sessions')
          .update({
            applications: updatedApplications
          })
          .eq('id', requestId);

        if (error) {
          console.error('Error updating scheduled session:', error);
        }
      } else {
        const { error } = await supabase
          .from('sessions')
          .update({
            applications: updatedApplications,
            status: WalkStatus.Accepted,
            walker_id: user.id
          })
          .eq('id', requestId);

        if (error) {
          console.error('Error updating on-demand session:', error);
        }
      }

      const { data: verifyData, error: verifyError } = await supabase
        .from('sessions')
        .select('applications')
        .eq('id', requestId)
        .single();

      console.log('Verification read error:', verifyError);
      console.log('Verification data:', verifyData);
      console.log('Verification applications:', verifyData?.applications);
      console.log('Verification applications includes user?', verifyData?.applications?.includes(user.id));

      if (verifyData?.applications?.includes(user.id)) {
        alert('Application submitted! The owner will review your application.');
      } else {
        alert('Application may not have been saved. Please try again.');
        return;
      }

      setTimeout(() => {
        console.log('Refreshing data after delay...');
        fetchRequests();
      }, 1000);
    } catch (error) {
      console.error('Unexpected error:', error);
      alert('Unexpected error applying to request');
    } finally {
      setApplyingTo(null);
    }
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-wblue flex items-center justify-center">
          <div className="text-white text-xl">Loading requests...</div>
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
            Browse Requests
          </h1>

          {requests.length === 0 ? (
            <p className="text-white text-center mt-8">
              No walk requests available at the moment. Check back later for new opportunities!
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {requests.map((request) => {
                const pet = pets[request.pet_id];
                const owner = owners[request.owner_id];

                return (
                  <Card
                    key={request.id}
                    className="bg-[#D9D9D9] p-4 hover:shadow-lg transition"
                  >
                    <div className="flex flex-col h-full">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xl font-semibold text-wblue text-center w-full">
                          {pet ? `${pet.name} (${pet.breed})` : 'Unknown Pet'}
                        </h3>
                      </div>

                      <div className="flex items-center justify-center mb-2">
                        <StatusPill status={request.status} />
                      </div>

                      <div className="text-sm text-gray-700 flex-1">
                        <p className="pt-1">
                          <strong>Owner:</strong> {owner?.full_name || 'Unknown Owner'}
                        </p>
                        <p className="pt-1">
                          <strong>Start Time:</strong> {formatDateTime(request.start_time)}
                        </p>
                        <p className="pt-1">
                          <strong>Duration:</strong> {request.duration_minutes} minutes
                        </p>
                        <p className="pt-1">
                          <strong>Compensation:</strong> ${request.compensation}
                        </p>
                        {request.meeting_location && (
                          <p className="pt-1">
                            <strong>Meeting Location:</strong> {request.meeting_location}
                          </p>
                        )}
                        {request.notes && (
                          <p className="pt-1">
                            <strong>Notes:</strong> {request.notes}
                          </p>
                        )}
                        {request.special_instructions && (
                          <p className="pt-1">
                            <strong>Special Instructions:</strong> {request.special_instructions}
                          </p>
                        )}
                        {pet?.description && (
                          <p className="pt-1">
                            <strong>Pet Description:</strong> {pet.description}
                          </p>
                        )}
                      </div>

                      <div className="mt-4 flex justify-center">
                        {(() => {
                          console.log(`Button logic for session ${request.id}:`, {
                            walker_id: request.walker_id,
                            currentUserId: currentUserId,
                            applications: request.applications,
                            isWalkerSelected: request.walker_id === currentUserId,
                            isApplied: request.applications?.includes(currentUserId || ''),
                            applyingTo: applyingTo
                          });
                          return null;
                        })()}
                        {request.walker_id === currentUserId ? (
                          <Button
                            disabled
                            size="sm"
                            variant="secondary"
                          >
                            Selected ✓
                          </Button>
                        ) : request.applications?.includes(currentUserId || '') ? (
                          <Button
                            disabled
                            size="sm"
                            variant="secondary"
                          >
                            Applied ✓
                          </Button>
                        ) : (
                          <Button
                            onClick={() => handleApply(request.id)}
                            disabled={applyingTo === request.id}
                            size="sm"
                          >
                            {applyingTo === request.id ? 'Applying...' : 'Apply'}
                          </Button>
                        )}
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
