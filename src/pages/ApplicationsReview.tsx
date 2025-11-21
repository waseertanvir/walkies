import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { supabase } from '../supabaseClient';
import ProtectedRoute from '../auth/ProtectedRoute';
import { Card, Button, StatusPill } from '../components/ui';
import { ChevronLeft } from 'lucide-react';

interface WalkerProfile {
  id: string;
  full_name: string;
  bio: string;
  years_experience: number;
  email: string;
}

interface Session {
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
  created_at: string;
}

interface Pet {
  id: string;
  name: string;
  breed: string;
}

export default function ApplicationsReview() {
  const navigate = useNavigate();
  const { sessionId } = useParams();
  const [session, setSession] = useState<Session | null>(null);
  const [pet, setPet] = useState<Pet | null>(null);
  const [applicants, setApplicants] = useState<WalkerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    const fetchSessionAndApplicants = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !sessionId) return;

        // Fetch session details
        const { data: sessionData } = await supabase
          .from('sessions')
          .select('*')
          .eq('id', sessionId)
          .eq('owner_id', user.id)
          .single();

        if (!sessionData) {
          alert('Session not found or you do not have permission to view it');
          navigate('/my-sessions');
          return;
        }

        setSession(sessionData);

        // Fetch pet data
        if (sessionData.pet_id) {
          const { data: petData } = await supabase
            .from('pets')
            .select('id, name, breed')
            .eq('id', sessionData.pet_id)
            .single();
          setPet(petData);
        }

        // Fetch applicant profiles
        if (sessionData.applications && sessionData.applications.length > 0) {
          console.log('ApplicationsReview - Fetching profiles for:', sessionData.applications);
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('id, full_name, bio, years_experience, email')
            .in('id', sessionData.applications);

          console.log('ApplicationsReview - Profiles data:', profilesData);
          setApplicants(profilesData || []);
        } else {
          console.log('ApplicationsReview - No applications found');
        }
      } catch (error) {
        console.error('Error fetching session and applicants:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSessionAndApplicants();
  }, [sessionId, navigate]);

  const handleAcceptWalker = async (walkerId: string) => {
    if (!session) return;

    setProcessing(walkerId);
    try {
      const { error } = await supabase
        .from('sessions')
        .update({
          walker_id: walkerId,
          status: 'accepted',
          applications: [] // Clear applications array
        })
        .eq('id', session.id);

      if (error) {
        alert('Error accepting walker: ' + error.message);
        return;
      }

      alert('Walker accepted successfully!');
      navigate('/my-sessions');
    } catch (error) {
      console.error('Unexpected error:', error);
      alert('Unexpected error accepting walker');
    } finally {
      setProcessing(null);
    }
  };

  const handleRejectWalker = async (walkerId: string) => {
    if (!session) return;

    setProcessing(walkerId);
    try {
      // Remove walker from applications array
      const updatedApplications = session.applications.filter(id => id !== walkerId);

      const { error } = await supabase
        .from('sessions')
        .update({
          applications: updatedApplications
        })
        .eq('id', session.id);

      if (error) {
        alert('Error rejecting walker: ' + error.message);
        return;
      }

      // Update local state
      setSession(prev => prev ? { ...prev, applications: updatedApplications } : null);
      setApplicants(prev => prev.filter(applicant => applicant.id !== walkerId));

      alert('Walker rejected');
    } catch (error) {
      console.error('Unexpected error:', error);
      alert('Unexpected error rejecting walker');
    } finally {
      setProcessing(null);
    }
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-wblue flex items-center justify-center">
        <div className="text-white text-xl">Loading applications...</div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-wblue flex items-center justify-center">
        <div className="text-white text-xl">Session not found</div>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-wblue p-4">
        <div className="max-w-4xl mx-auto">
          <div className="relative mb-6">
            <button
              onClick={() => navigate(-1)}
              className="fixed top-4 left-4 z-50 bg-wsage/75 backdrop-blur-sm text-black p-2 rounded-full shadow-lg"
              >
              <ChevronLeft size={30} />
            </button>
            <div className="flex justify-center">
              <h1 className="text-2xl font-bold text-white text-center mt-2">Review Applications</h1>
            </div>
          </div>

          {/* Session Details */}
          <Card className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-wblue">
                {pet?.name} ({pet?.breed})
              </h2>
              <StatusPill status={session.status} />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Start Time:</span> {formatDateTime(session.start_time)}
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Duration:</span> {session.duration_minutes} minutes
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Compensation:</span> ${session.compensation}
                </p>
              </div>
              <div>
                {session.walker_id ? (
                  <p className="text-sm text-green-700 font-medium bg-green-100 px-2 py-1 rounded">
                    <span className="font-medium">Status:</span> Walker Selected
                  </p>
                ) : (
                  <p className="text-sm text-wblue font-medium">
                    <span className="font-medium">Applications:</span> {applicants.length} walker(s) waiting for review
                  </p>
                )}
                {session.meeting_location && (
                  <p className="text-sm text-gray-800">
                    <span className="font-medium text-gray-900">Meeting Location:</span> {session.meeting_location}
                  </p>
                )}
              </div>
            </div>

            {session.notes && (
              <div className="mt-4">
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Notes:</span> {session.notes}
                </p>
              </div>
            )}

            {session.special_instructions && (
              <div className="mt-4">
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Special Instructions:</span> {session.special_instructions}
                </p>
              </div>
            )}
          </Card>

          {/* Applications */}
          {applicants.length === 0 ? (
            <Card>
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-wyellow rounded-full flex items-center justify-center text-white text-2xl mx-auto mb-4">
                  👥
                </div>
                <h3 className="text-lg font-semibold text-wblue mb-2">No Applications Yet</h3>
                <p className="text-gray-600">No walkers have applied to this session yet.</p>
              </div>
            </Card>
          ) : (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-white mb-4">
                Walker Applications ({applicants.length})
              </h2>
              
              {applicants.map((walker) => {
                console.log('Rendering walker:', walker);
                return (
                <Card key={walker.id}>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-semibold text-wblue">
                          {walker.full_name || 'Unknown Walker'}
                        </h3>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-700 font-medium">
                            {walker.years_experience || 0} years experience
                          </span>
                        </div>
                      </div>
                      
                      <div className="mb-3">
                        <p className="text-sm text-gray-800">
                          <span className="font-medium text-gray-900">Email:</span> {walker.email}
                        </p>
                      </div>

                      {walker.bio && (
                        <div className="mb-3">
                          <p className="text-sm text-gray-800">
                            <span className="font-medium text-gray-900">Bio:</span> {walker.bio}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="ml-4 flex flex-col space-y-2">
                      {session.walker_id ? (
                        <div className="text-center">
                          <p className="text-sm text-green-700 font-medium bg-green-100 px-2 py-1 rounded">
                            {session.walker_id === walker.id ? 'Selected ✓' : 'Not Selected'}
                          </p>
                        </div>
                      ) : (
                        <>
                          <Button
                            onClick={() => handleAcceptWalker(walker.id)}
                            disabled={processing === walker.id}
                            size="sm"
                            className="min-w-[100px]"
                          >
                            {processing === walker.id ? 'Processing...' : 'Accept'}
                          </Button>
                          <Button
                            onClick={() => handleRejectWalker(walker.id)}
                            disabled={processing === walker.id}
                            size="sm"
                            variant="danger"
                            className="min-w-[100px]"
                          >
                            {processing === walker.id ? 'Processing...' : 'Reject'}
                          </Button>
                        </>
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

