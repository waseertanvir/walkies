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

      // Fetch pets and owners data
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

      // Get current session to check applications
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

      // Check if user already applied
      if (session.applications && session.applications.includes(user.id)) {
        alert('You have already applied to this session');
        setApplyingTo(null);
        return;
      }

      // Add user to applications array
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
      } else {
        const { error } = await supabase
          .from('sessions')
          .update({
            applications: updatedApplications,
            status: WalkStatus.Accepted,
            walker_id: user.id
          })
          .eq('id', requestId);
      }

      // Verify the update by reading back from database
      const { data: verifyData, error: verifyError } = await supabase
        .from('sessions')
        .select('applications')
        .eq('id', requestId)
        .single();

      console.log('Verification read error:', verifyError);
      console.log('Verification data:', verifyData);
      console.log('Verification applications:', verifyData?.applications);
      console.log('Verification applications includes user?', verifyData?.applications?.includes(user.id));

      // Check if verification shows the update worked
      if (verifyData?.applications?.includes(user.id)) {
        console.log('✅ Application successfully added to database');
        alert('Application submitted! The owner will review your application.');
      } else {
        console.log('❌ Application not found in verification read');
        alert('Application may not have been saved. Please try again.');
        return;
      }

      // Wait a moment for database to fully commit, then refresh
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
      <div className="min-h-screen bg-wblue p-4">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => navigate(-1)}
            className="absolute top-4 left-4 bg-wolive text-black p-2 rounded-full shadow-lg hover:bg-green-600 transition"
            >
            <ChevronLeft size={30} />
          </button>
          <div className="flex items-center mb-6">
            {/* <Button variant="secondary" onClick={() => navigate('/')} className="mr-4">
              ← Back
            </Button> */}
            <h1 className="text-2xl font-bold text-white">Available Walk Requests</h1>
          </div>

          {requests.length === 0 ? (
            <Card>
              <div className="text-center py-8">
                <p className="text-gray-600 text-lg">No walk requests available at the moment.</p>
                <p className="text-gray-500 text-sm mt-2">Check back later for new opportunities!</p>
              </div>
            </Card>
          ) : (
            <div className="space-y-4">
              {requests.map((request) => (
                <Card key={request.id} className="hover:shadow-lg transition-shadow">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-wblue">
                          {pets[request.pet_id]?.name} ({pets[request.pet_id]?.breed})
                        </h3>
                        <StatusPill status={request.status} />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Owner:</span> {owners[request.owner_id]?.full_name}
                          </p>
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Start Time:</span> {formatDateTime(request.start_time)}
                          </p>
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Duration:</span> {request.duration_minutes} minutes
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Compensation:</span> ${request.compensation}
                          </p>
                          {request.meeting_location && (
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">Meeting Location:</span> {request.meeting_location}
                            </p>
                          )}
                        </div>
                      </div>

                      {request.notes && (
                        <div className="mb-3">
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Notes:</span> {request.notes}
                          </p>
                        </div>
                      )}

                      {request.special_instructions && (
                        <div className="mb-3">
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Special Instructions:</span> {request.special_instructions}
                          </p>
                        </div>
                      )}

                      <div className="mb-3">
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Pet Description:</span> {pets[request.pet_id]?.description}
                        </p>
                      </div>

                      {/* Applications Count */}
                      <div className="mb-3">
                        <p className="text-sm text-wblue font-medium">
                          <span className="font-medium">Applications:</span> {request.applications?.length || 0} walker(s) applied
                        </p>
                      </div>
                    </div>

                    <div className="ml-4">
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
              ))}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
