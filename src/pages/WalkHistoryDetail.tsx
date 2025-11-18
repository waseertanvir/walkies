import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router';
import { supabase } from '../supabaseClient';
import ProtectedRoute from '../auth/ProtectedRoute';
import { Card, Button, StatusPill } from '../components/ui';
import { ChevronLeft } from 'lucide-react';
import { APIProvider, Map, AdvancedMarker } from '@vis.gl/react-google-maps';
import { TrajectoryLine } from '../components/TrajectoryLine';

type LatLng = { lat: number; lng: number };

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
  activity: string | null;
}

interface Pet {
  id: string;
  name: string;
  breed: string;
  description: string;
}

interface Profile {
  id: string;
  full_name: string;
  email: string;
}

interface LocationPoint {
  lat: number;
  long: number;
  created_at: string;
}

export default function WalkHistoryDetail() {
  const navigate = useNavigate();
  const { sessionId } = useParams();
  const [session, setSession] = useState<Session | null>(null);
  const [pet, setPet] = useState<Pet | null>(null);
  const [walker, setWalker] = useState<Profile | null>(null);
  const [owner, setOwner] = useState<Profile | null>(null);
  const [locationPoints, setLocationPoints] = useState<LocationPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWalkDetails = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !sessionId) return;

        // Fetch session
        const { data: sessionData, error: sessionError } = await supabase
          .from('sessions')
          .select('*')
          .eq('id', sessionId)
          .single();

        if (sessionError) {
          console.error('Error fetching session:', sessionError);
          console.log('Error code:', sessionError.code);
          console.log('Error message:', sessionError.message);
        }

        if (!sessionData) {
          console.log('Session not found for ID:', sessionId);
          alert('Walk not found');
          navigate(-1);
          return;
        }

        console.log('Session found:', sessionData);
        console.log('Session status:', sessionData.status);

        // Verify user has access (either owner or walker)
        if (sessionData.owner_id !== user.id && sessionData.walker_id !== user.id) {
          alert('You do not have permission to view this walk');
          navigate(-1);
          return;
        }

        setSession(sessionData);

        // Fetch pet
        if (sessionData.pet_id) {
          const { data: petData } = await supabase
            .from('pets')
            .select('*')
            .eq('id', sessionData.pet_id)
            .single();
          setPet(petData);
        }

        // Fetch walker profile
        if (sessionData.walker_id) {
          const { data: walkerData } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .eq('id', sessionData.walker_id)
            .single();
          setWalker(walkerData);
        }

        // Fetch owner profile
        if (sessionData.owner_id) {
          const { data: ownerData } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .eq('id', sessionData.owner_id)
            .single();
          setOwner(ownerData);
        }

        // Fetch location points
        console.log('Fetching location points for session:', sessionId);
        const { data: pointsData, error: pointsError } = await supabase
          .from('session_detail')
          .select('lat, long, created_at')
          .eq('session_id', sessionId)
          .order('created_at', { ascending: true });

        if (pointsError) {
          console.error('❌ Error fetching location points:', pointsError);
          console.error('Error code:', pointsError.code);
          console.error('Error message:', pointsError.message);
          console.error('Error details:', pointsError.details);
          console.error('Error hint:', pointsError.hint);
        } else {
          console.log(`✅ Fetched ${pointsData?.length || 0} location points for session ${sessionId}`);
          if (pointsData && pointsData.length > 0) {
            console.log('First point:', pointsData[0]);
            console.log('Last point:', pointsData[pointsData.length - 1]);
            console.log('All points:', pointsData);
          } else {
            console.warn('⚠️ No location points found. Check if SQL was executed successfully.');
          }
        }

        console.log('Setting locationPoints state with:', pointsData?.length || 0, 'points');
        setLocationPoints(pointsData || []);
      } catch (error) {
        console.error('Error fetching walk details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchWalkDetails();
  }, [sessionId, navigate]);

  // Debug: Log when locationPoints changes
  useEffect(() => {
    console.log('📍 locationPoints state updated:', locationPoints.length, 'points');
    if (locationPoints.length > 0) {
      console.log('📍 First locationPoint:', locationPoints[0]);
      console.log('📍 Last locationPoint:', locationPoints[locationPoints.length - 1]);
    }
  }, [locationPoints]);

  const path: LatLng[] = useMemo(() => {
    const mapped = locationPoints.map(p => ({ lat: p.lat, lng: p.long }));
    console.log('🗺️ Path useMemo - locationPoints:', locationPoints.length, 'mapped path:', mapped.length);
    if (mapped.length > 0) {
      console.log('🗺️ First path point:', mapped[0]);
      console.log('🗺️ Last path point:', mapped[mapped.length - 1]);
    }
    return mapped;
  }, [locationPoints]);

  const mapCenter = useMemo<LatLng>(() => {
    if (path.length > 0) {
      // Use middle point of path as center
      const midIndex = Math.floor(path.length / 2);
      return path[midIndex];
    }
    return { lat: 49.2488, lng: -123.0025 }; // Default to Burnaby
  }, [path]);

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-wblue flex items-center justify-center">
          <div className="text-white text-xl">Loading walk details...</div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!session) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-wblue flex items-center justify-center">
          <div className="text-white text-xl">Walk not found</div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-wblue p-4">
        <div className="max-w-6xl mx-auto">
          <button
            onClick={() => navigate(-1)}
            className="fixed top-4 left-4 z-50 bg-wolive text-black p-2 rounded-full shadow-lg hover:bg-green-600 transition"
          >
            <ChevronLeft size={30} />
          </button>

          <div className="mb-6 mt-12">
            <h1 className="text-2xl font-bold text-white text-center">Walk Details</h1>
          </div>

          {/* Walk Information Card */}
          <Card className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-wblue">
                {pet?.name} ({pet?.breed})
              </h2>
              <StatusPill status={session.status} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-sm text-gray-600 mb-2">
                  <span className="font-medium">Owner:</span> {owner?.full_name || 'Unknown'}
                </p>
                {walker && (
                  <p className="text-sm text-gray-600 mb-2">
                    <span className="font-medium">Walker:</span> {walker.full_name}
                  </p>
                )}
                <p className="text-sm text-gray-600 mb-2">
                  <span className="font-medium">Start Time:</span> {formatDateTime(session.start_time)}
                </p>
                {session.end_time && (
                  <p className="text-sm text-gray-600 mb-2">
                    <span className="font-medium">End Time:</span> {formatDateTime(session.end_time)}
                  </p>
                )}
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-2">
                  <span className="font-medium">Duration:</span> {session.duration_minutes} minutes
                </p>
                <p className="text-sm text-gray-600 mb-2">
                  <span className="font-medium">Compensation:</span> ${session.compensation}
                </p>
                {session.meeting_location && (
                  <p className="text-sm text-gray-600 mb-2">
                    <span className="font-medium">Meeting Location:</span> {session.meeting_location}
                  </p>
                )}
                {session.activity && (
                  <p className="text-sm text-gray-600 mb-2">
                    <span className="font-medium">Activity:</span> {session.activity}
                  </p>
                )}
              </div>
            </div>

            {pet?.description && (
              <div className="mb-3">
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Pet Description:</span> {pet.description}
                </p>
              </div>
            )}

            {session.notes && (
              <div className="mb-3">
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Notes:</span> {session.notes}
                </p>
              </div>
            )}

            {session.special_instructions && (
              <div className="mb-3">
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Special Instructions:</span> {session.special_instructions}
                </p>
              </div>
            )}

            {locationPoints.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Location Points Recorded:</span> {locationPoints.length} points
                </p>
              </div>
            )}
          </Card>

          {/* Map with Walk Path */}
          {(() => {
            console.log('🎨 Rendering check - path.length:', path.length, 'locationPoints.length:', locationPoints.length);
            return path.length > 0;
          })() ? (
            <Card className="mb-6">
              <h3 className="text-lg font-semibold text-wblue mb-4">Walk Path</h3>
              <div className="w-full" style={{ height: '400px' }}>
                {import.meta.env.VITE_GOOGLE_MAPS_API_KEY ? (
                  <APIProvider apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}>
                    <Map
                      mapId={import.meta.env.VITE_GOOGLE_MAP_ID}
                      style={{ width: '100%', height: '100%' }}
                      defaultCenter={mapCenter}
                      defaultZoom={15}
                      disableDefaultUI
                      clickableIcons={false}
                    >
                    <TrajectoryLine
                      path={path}
                      options={{
                        strokeColor: "#ff6200ff",
                        strokeOpacity: 1.0,
                        strokeWeight: 4,
                      }}
                    />

                    {/* Start marker */}
                    {path[0] && (
                      <AdvancedMarker position={path[0]}>
                        <div
                          style={{
                            width: 20,
                            height: 20,
                            borderRadius: '50%',
                            backgroundColor: '#28A745',
                            border: '3px solid white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                          title="Start"
                        >
                          <span style={{ color: 'white', fontSize: '12px', fontWeight: 'bold' }}>S</span>
                        </div>
                      </AdvancedMarker>
                    )}

                    {/* End marker */}
                    {path[path.length - 1] && (
                      <AdvancedMarker position={path[path.length - 1]}>
                        <div
                          style={{
                            width: 20,
                            height: 20,
                            borderRadius: '50%',
                            backgroundColor: '#DC3545',
                            border: '3px solid white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                          title="End"
                        >
                          <span style={{ color: 'white', fontSize: '12px', fontWeight: 'bold' }}>E</span>
                        </div>
                      </AdvancedMarker>
                    )}
                  </Map>
                </APIProvider>
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded">
                    <div className="text-center p-4">
                      <p className="text-gray-600 mb-2">Google Maps API key not configured</p>
                      <p className="text-sm text-gray-500">
                        Please set VITE_GOOGLE_MAPS_API_KEY in your .env file
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          ) : (
            <Card className="mb-6">
              <div className="text-center py-8">
                <p className="text-gray-600">No location data available for this walk.</p>
                <p className="text-sm text-gray-500 mt-2">
                  Debug: path.length={path.length}, locationPoints.length={locationPoints.length}
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}

