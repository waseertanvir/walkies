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
  dropoff_location: string;
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
    console.log('locationPoints state updated:', locationPoints.length, 'points');
    if (locationPoints.length > 0) {
      console.log('First locationPoint:', locationPoints[0]);
      console.log('Last locationPoint:', locationPoints[locationPoints.length - 1]);
    }
  }, [locationPoints]);

  const path: LatLng[] = useMemo(() => {
    const mapped = locationPoints.map(p => ({ lat: p.lat, lng: p.long }));
    console.log('Path useMemo - locationPoints:', locationPoints.length, 'mapped path:', mapped.length);
    if (mapped.length > 0) {
      console.log('First path point:', mapped[0]);
      console.log('Last path point:', mapped[mapped.length - 1]);
    }
    return mapped;
  }, [locationPoints]);

  const { center: mapCenter, zoom: mapZoom } = useMemo(() => {
    if (path.length === 0) {
      return {
        center: { lat: 49.2488, lng: -123.0025 },
        zoom: 14
      };
    }

    let minLat = path[0].lat;
    let maxLat = path[0].lat;
    let minLng = path[0].lng;
    let maxLng = path[0].lng;

    path.forEach(p => {
      if (p.lat < minLat) minLat = p.lat;
      if (p.lat > maxLat) maxLat = p.lat;
      if (p.lng < minLng) minLng = p.lng;
      if (p.lng > maxLng) maxLng = p.lng;
    });

    // Midpoint of extremes (not average of all points)
    const midLat = (minLat + maxLat) / 2;
    const midLng = (minLng + maxLng) / 2;

    const latSpan = maxLat - minLat;
    const lngSpan = maxLng - minLng;
    const maxSpan = Math.max(latSpan, lngSpan);

    let zoom;
    if (maxSpan < 0.0005) zoom = 17;
    else if (maxSpan < 0.001) zoom = 16;
    else if (maxSpan < 0.005) zoom = 15;
    else if (maxSpan < 0.01) zoom = 14;
    else if (maxSpan < 0.05) zoom = 13;
    else if (maxSpan < 0.1) zoom = 12;
    else if (maxSpan < 0.5) zoom = 11;
    else zoom = 10;

    return {
      center: { lat: midLat, lng: midLng },
      zoom
    };
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

  const startTime = formatTime(session.start_time);
  const endTime = session.end_time ? formatTime(session.end_time) : null;

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-wblue p-4">
        <div className="max-w-6xl mx-auto">
          <button
            onClick={() => navigate(-1)}
            className="fixed top-4 left-4 z-50 bg-wsage/75 backdrop-blur-sm text-black p-2 rounded-full shadow-lg flex items-center justify-center"
          >
            <ChevronLeft size={30} />
          </button>

          <div className="mb-6 mt-12 flex flex-col items-center gap-2">
            <h1 className="text-3xl font-bold text-white text-center">
              {pet && (
                <>
                  {pet.name} ({pet.breed})
                </>
              )}
            </h1>
          </div>

          {/* Walk Information Card */}
          <Card className="mb-6 bg-[#D9D9D9] rounded-2xl shadow-md p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex justify-between items-baseline text-sm text-gray-800">
                  <span className="font-semibold">Owner</span>
                  <span className="text-right text-gray-700">
                    {owner?.full_name || 'Unknown'}
                  </span>
                </div>
                {walker && (
                  <div className="flex justify-between items-baseline text-sm text-gray-800">
                    <span className="font-semibold">Walker</span>
                    <span className="text-right text-gray-700">
                      {walker.full_name}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-baseline text-sm text-gray-800">
                  <span className="font-semibold">Start Time</span>
                  <span className="text-right text-gray-700">
                    {formatDateTime(session.start_time)}
                  </span>
                </div>
                {session.end_time && (
                  <div className="flex justify-between items-baseline text-sm text-gray-800">
                    <span className="font-semibold">End Time</span>
                    <span className="text-right text-gray-700">
                      {formatDateTime(session.end_time)}
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-baseline text-sm text-gray-800">
                  <span className="font-semibold">Duration</span>
                  <span className="text-right text-gray-700">
                    {session.duration_minutes} minutes
                  </span>
                </div>
                <div className="flex justify-between items-baseline text-sm text-gray-800">
                  <span className="font-semibold">Compensation</span>
                  <span className="text-right text-gray-700">
                    ${session.compensation}
                  </span>
                </div>
                {session.meeting_location && (
                  <div className="flex flex-col text-sm text-gray-800">
                    <span className="font-semibold mb-1">Pickup Location</span>
                    <span className="text-gray-700">
                      {session.meeting_location}
                    </span>
                  </div>
                )}
                {session.dropoff_location && (
                  <div className="flex flex-col text-sm text-gray-800">
                    <span className="font-semibold mb-1">Dropoff Location</span>
                    <span className="text-gray-700">
                      {session.dropoff_location}
                    </span>
                  </div>
                )}
                {session.activity && (
                  <div className="flex flex-col text-sm text-gray-800">
                    <span className="font-semibold mb-1">Activity</span>
                    <span className="text-gray-700">{session.activity}</span>
                  </div>
                )}
              </div>
            </div>

            {pet?.description && (
              <div className="mt-6">
                <p className="text-sm text-gray-800 font-semibold mb-1">
                  Pet Description
                </p>
                <p className="text-sm text-gray-700">{pet.description}</p>
              </div>
            )}

            {session.notes && (
              <div className="mt-4">
                <p className="text-sm text-gray-800 font-semibold mb-1">
                  Notes
                </p>
                <p className="text-sm text-gray-700">{session.notes}</p>
              </div>
            )}

            {session.special_instructions && (
              <div className="mt-4">
                <p className="text-sm text-gray-800 font-semibold mb-1">
                  Special Instructions
                </p>
                <p className="text-sm text-gray-700">
                  {session.special_instructions}
                </p>
              </div>
            )}

            {locationPoints.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-300">
                <p className="text-sm text-gray-800 font-semibold mb-1">
                  Location Data
                </p>
                <p className="text-sm text-gray-700">
                  {locationPoints.length} points recorded from {startTime}
                  {endTime ? ` to ${endTime}` : ''}
                </p>
              </div>
            )}
          </Card>

          {/* Map with Walk Path */}
          {(() => {
            console.log('🎨 Rendering check - path.length:', path.length, 'locationPoints.length:', locationPoints.length);
            return path.length > 0;
          })() ? (
            <Card className="mb-6 bg-[#D9D9D9] rounded-2xl shadow-md p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold text-wblue">Walk Path</h3>
                <div className="flex gap-3 text-xs text-gray-700">
                  <div className="flex items-center gap-1">
                    <span className="inline-block w-3 h-3 rounded-full bg-green-600" />
                    <span>Pickup</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="inline-block w-3 h-3 rounded-full bg-red-600" />
                    <span>Dropoff</span>
                  </div>
                </div>
              </div>
              <div className="w-full rounded-xl overflow-hidden" style={{ height: '400px' }}>
                {import.meta.env.VITE_GOOGLE_MAPS_API_KEY ? (
                  <APIProvider apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}>
                    <Map
                      mapId={import.meta.env.VITE_GOOGLE_MAP_ID}
                      style={{ width: '100%', height: '100%' }}
                      defaultCenter={mapCenter}
                      defaultZoom={mapZoom}
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

                      {/* Pickup marker (first point) */}
                      {path[0] && (
                        <AdvancedMarker position={path[1]}>
                          <div
                            style={{
                              width: 24,
                              height: 24,
                              borderRadius: '50%',
                              backgroundColor: '#16A34A', // green-600
                              border: '3px solid white',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                            title="Pickup"
                          >
                            <span style={{ color: 'white', fontSize: '12px', fontWeight: 'bold' }}>P</span>
                          </div>
                        </AdvancedMarker>
                      )}

                      {/* Dropoff marker (last point) */}
                      {path[path.length - 1] && (
                        <AdvancedMarker position={path[path.length - 1]}>
                          <div
                            style={{
                              width: 24,
                              height: 24,
                              borderRadius: '50%',
                              backgroundColor: '#DC2626', // red-600
                              border: '3px solid white',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                            title="Dropoff"
                          >
                            <span style={{ color: 'white', fontSize: '12px', fontWeight: 'bold' }}>D</span>
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
            <Card className="mb-6 bg-[#D9D9D9] rounded-2xl shadow-md">
              <div className="text-center py-8">
                <p className="text-gray-700 font-semibold">
                  No location data available for this walk.
                </p>
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
