import { useEffect, useRef, useState, useMemo } from 'react';
import { APIProvider, Map, AdvancedMarker, useMap } from '@vis.gl/react-google-maps';
import { supabase } from '../supabaseClient';
import ProtectedRoute from '../auth/ProtectedRoute';
import { useNavigate, useParams } from 'react-router';
import OwnerMenu from '../components/ownerMenu';
import WalkerMenu from '../components/walkerMenu';
import { TrajectoryLine } from '../components/TrajectoryLine';
import logo from '../assets/Logo.png'
import Loader from "../Loader";
import { WalkStatus } from '../constants/WalkStatus';
import { Rating } from '@smastrom/react-rating'
import '@smastrom/react-rating/style.css'

type LatLng = { lat: number; lng: number };
type Role = 'owner' | 'walker' | string;

type UserLocation = {
  userID: string;
  role: Role;
  name: string;
  position: LatLng;
  timestamp: string;
};

type Session = {
  id: string;
  owner_id: string;
  walker_id: string | null;
  status: string;
  start_time: string;
  duration_minutes: number;
};

type SessionDetail = {
  session_id: string | undefined;
  lat: number;
  long: number;
  created_at: string | null;
}

// calculating distances
const toRad = (v: number) => (v * Math.PI) / 180;
const haversine = (a: LatLng, b: LatLng) => {
  const R = 6371e3;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const la1 = toRad(a.lat);
  const la2 = toRad(b.lat);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h = sinDLat ** 2 + Math.cos(la1) * Math.cos(la2) * sinDLng ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
};
const within20m = (a?: LatLng | null, b?: LatLng | null) =>
  !!a && !!b && haversine(a, b) <= 20;

// draw line logic
function WalkerPath({ path }: { path: LatLng[] }) {
  const map = useMap();
  const polylineRef = useRef<google.maps.Polyline | null>(null);

  useEffect(() => {
    if (!map) return;
    if (!polylineRef.current) {
      polylineRef.current = new google.maps.Polyline({
        map,
        path,
        strokeColor: '#007BFF',
        strokeWeight: 5,
        strokeOpacity: 1,
      });
    } else {
      polylineRef.current.setPath(path);
    }
  }, [map, path]);

  return null;
}

export default function Track() {
  const navigate = useNavigate();
  const { id: sessionId } = useParams();

  const [me, setMe] = useState<{ id: string; name: string; role: Role } | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [users, setUsers] = useState<UserLocation[]>([]);
  const [myPosition, setMyPosition] = useState<LatLng | null>(null);
  const [path, setPath] = useState<LatLng[]>([]);
  const [sessionStatus, setSessionStatus] = useState<string>();
  const [isLoaded, setIsLoaded] = useState(false);
  const intervalRef = useRef<number | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const center = useMemo<LatLng>(() => myPosition ?? { lat: 49.24, lng: -123.05 }, [myPosition]);
  const [rating, setRating] = useState(0)
  const [ratingsFormData, setRatingsFormData] = useState({
    rating: 0,
    description: ''
  });

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, role, avatar_url')
        .eq('id', user.id)
        .single();

      setMe({ id: user.id, name: profile?.full_name ?? '', role: profile?.role ?? '' });

      if (profile?.role === 'walker') {
        const { data } = await supabase
          .from('profiles')
          .select('full_name, role, avatar_url')
          .eq('id', session?.owner_id)
          .single();

        setAvatarUrl(data?.avatar_url ?? null);
      } else {
        setAvatarUrl(profile?.avatar_url ?? null);
      }

      const { data: s } = await supabase.from('sessions').select('*').eq('id', sessionId).single();
      if (!s && me?.role == "walker") {
        navigate('/walker/dashboard');
        return;
      } else if (!s && me?.role == "owner") {
        navigate('/owner/dashboard');
        return;
      }

      setSession(s);
      setSessionStatus(s.status);
      setIsLoaded(true);
    })();
  }, [navigate, sessionId]);

  // realtime
  useEffect(() => {
    if (!me) return;

    const ch = supabase.channel('liveLocations');
    channelRef.current = ch;

    // listener
    ch.on('broadcast', { event: 'location' }, (payload) => {
      const p = payload.payload as UserLocation;
      setUsers((prev) => {
        const i = prev.findIndex((u) => u.userID === p.userID);
        if (i >= 0) {
          const copy = [...prev];
          copy[i] = p;
          return copy;
        }
        return [...prev, p];
      });

      // if this is the walker, update the polyline path
      if (session?.walker_id && p.userID === session.walker_id && sessionStatus === WalkStatus.InProgress) {
        console.log(payload)
        setPath((prev) => {
          const last = prev[prev.length - 1];
          if (!last || haversine(last, p.position) >= 1) return [...prev, p.position];
          return prev;
        });
      }
    });

    ch.subscribe();

    // send location
    const sendLocation = async (pos: LatLng) => {
      await ch.send({
        type: 'broadcast',
        event: 'location',
        payload: {
          userID: me.id,
          role: me.role,
          name: me.name,
          position: pos,
          timestamp: new Date().toISOString(),
        },
      });
    };

    let watchId: number | null = null;
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((p) => {
        const pos = { lat: p.coords.latitude, lng: p.coords.longitude };
        setMyPosition(pos);
        sendLocation(pos);
      });

      watchId = navigator.geolocation.watchPosition(
        (p) => {
          const pos = { lat: p.coords.latitude, lng: p.coords.longitude };
          setMyPosition(pos);
          sendLocation(pos);
        },
        () => { },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
      );
    }

    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [me, session, sessionStatus === WalkStatus.InProgress]);

  const ownerPos = users.find((u) => u.role === 'owner')?.position ?? null;
  const walkerPos = users.find((u) => u.role === 'walker')?.position ?? null;
  const iAmWalker = me?.role === 'walker' && session?.walker_id === me.id;

  const canStart =
    iAmWalker && session?.status === 'accepted' && within20m(ownerPos, walkerPos) && sessionStatus !== WalkStatus.InProgress;

  const canEnd = (() => {
    if (!session || !iAmWalker || session.status !== WalkStatus.InProgress) return false;
    const end = new Date(session.start_time);
    end.setMinutes(end.getMinutes() + session.duration_minutes);
    return within20m(ownerPos, walkerPos) && new Date() >= end;
  })();

  const startWalk = async () => {
    if (!session) return;

    await supabase.from('sessions')
      .update({ status: WalkStatus.InProgress })
      .eq('id', session.id);

    setSession({ ...session, status: WalkStatus.InProgress });
    setSessionStatus(WalkStatus.InProgress)
  };

  const stopInterval = () => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const endWalk = async () => {
    if (!session) return;

    await supabase.from('sessions')
      .update({
        status: WalkStatus.Rate
      })
      .eq('id', session.id);


    const result: SessionDetail[] = [];

    for (let i = 0; i < path.length; i++) {
      const { lat, lng } = path[i];
      result.push({
        session_id: sessionId,
        lat: lat,
        long: lng,
        created_at: new Date().toISOString()
      });
    }

    const { error } = await supabase.from('session_detail')
      .insert(result)
      .eq('id', session.id);

    console.log("Going to persist data in session_detail: " + result);

    if (error) console.error('Insert failed:', error);

    setSession({ ...session, status: WalkStatus.Rate });
    setSessionStatus(WalkStatus.Rate);
  };

  if (!isLoaded)
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-wblue flex items-center justify-center">
          <div className="text-white text-xl">Loading map…</div>
        </div>
      </ProtectedRoute>
    );

  const startCheckingForWalkerRequests = async () => {
    console.log("Going to start looking for walkers");

    if (intervalRef.current !== null) return;
    intervalRef.current = window.setInterval(async () => {

      const { data, error } = await supabase.from('sessions')
        .select('walker_id')
        .eq('id', sessionId)
        .single();

      console.log("Searching for walker:", data);

      if (data?.walker_id != null) {
        stopInterval();
        setSessionStatus(WalkStatus.Accepted);
        startCheckingForWalkStart();
      }

    }, 2000);

  };

  const startCheckingForWalkStart = async () => {
    console.log("Going to start checking if the walker has started walk.");

    if (intervalRef.current !== null) return;
    intervalRef.current = window.setInterval(async () => {

      const { data, error } = await supabase.from('sessions')
        .select('status')
        .eq('id', sessionId)
        .single();

      if (data != null && data.status == WalkStatus.InProgress) {
        setSessionStatus(WalkStatus.InProgress);
        stopInterval()
        startCheckingForWalkEnd();
      }

    }, 2000);
  }

  const startCheckingForWalkEnd = async () => {
    console.log("Going to start checking for walk end.");

    if (intervalRef.current !== null) return;
    intervalRef.current = window.setInterval(async () => {

      const { data, error } = await supabase.from('sessions')
        .select('status')
        .eq('id', sessionId)
        .single();

      if (data != null && data.status == WalkStatus.Completed) {
        setSessionStatus(WalkStatus.Completed);
        stopInterval()
      }

    }, 2000);
  }

  if (sessionStatus == WalkStatus.Pending) {
    startCheckingForWalkerRequests()
  }

  const handleSkipReviewButtonClick = () => {
    navigate('/owner/dashboard');
  }

  const handleRatingFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const now = new Date(Date.now());
      const formattedDate = now.toISOString().slice(0, 16);

      const { data, error } = await supabase
        .from('walk_review')
        .insert({
          session_id: sessionId,
          created_at: formattedDate,
          rating: 0,
          description: ''
        })
        .select('session_id');

      const insertedId = data?.[0]?.session_id;

      if (!insertedId) {
        console.warn('Something went wrong when submitting your review.');
        alert('Something went wrong when submitting your review. Please skip or try again later.');
        return;
      }

      await supabase.from('sessions')
        .update({
          status: WalkStatus.Completed
        })
        .eq('id', sessionId);

      navigate('/owner/dashboard');

      if (error) {
        console.error('Error creating request:', error);
        alert('Error creating request: ' + error.message);
        return;
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      alert('Unexpected error creating request');
    }
  }

  return (
    <ProtectedRoute>
      {me?.role === 'owner' && <OwnerMenu />}
      {me?.role === 'walker' && <WalkerMenu />}

      <APIProvider apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}>
        <Map
          mapId={import.meta.env.VITE_GOOGLE_MAP_ID}
          style={{ width: '100vw', height: '75%' }}
          defaultCenter={center}
          defaultZoom={16}
          disableDefaultUI
          clickableIcons={false}
        >
          {users.map((u) => {
            const color = u.role === 'walker' ? '#007BFF' : u.role === 'owner' ? '#28A745' : '#6C757D';
            return (
              <AdvancedMarker key={u.userID} position={u.position}>
                <div
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    backgroundColor: color,
                    border: '2px solid white',
                  }}
                  title={u.name}
                />
              </AdvancedMarker>
            );
          })}

          <TrajectoryLine
            path={path}
            options={{
              strokeColor: "#ff6200ff",
              strokeOpacity: 1.0,
              strokeWeight: 3,
            }}
          />

          {myPosition && (
            <AdvancedMarker position={myPosition}>
              <div
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  backgroundColor: '#FE7F2D',
                  border: '3px solid white',
                }}
                title="You"
              />
            </AdvancedMarker>
          )}

          {sessionStatus === WalkStatus.InProgress && path.length > 1 && <WalkerPath path={path} />}
        </Map>
      </APIProvider>


      {me?.role === 'walker' && (
        <div className="absolute bottom-0 w-full h-25% rounded-t-xl rounded-b-none bg-wsage p-5">
          <div className='grid items-center justify-center h-full w-full'>
            <button
              onClick={startWalk}
              className={`absolute mt-2 px-3 py-1 rounded ${canStart == true ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'
                }`}
            >
              Start Walk
            </button>

            <button
              onClick={endWalk}
              className={`absolute mt-2 px-3 py-1 rounded ${canEnd == true ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'
                }`}
            >
              End Walk
            </button>

            {avatarUrl ? (
              <img src={avatarUrl} alt={me?.name ?? 'Profile'}
                className="relative left-1/2 -top-20 transform -translate-x-1/2 max-w-[125px] max-h-[125px] w-full h-auto
                rounded-full border-4 border-yellow-400 object-cover"/>
            ) : (
              <span className="text-white text-xl absolute left-1/2 -translate-x-1/2 -top-16">
                No Image
              </span>
            )}

            <img
              src={logo}
              alt="Logo"
              className="
                absolute          
                top-0 right-0     
                m-5     
                max-h-10         
                max-w-10      
                h-auto
                "
            />

            <p className="absolute inset-x-0 top-20 text-center text-yellow-500 font-bold text-1xl">
              Franklin
            </p>

            <div className="bg-orange-500 hover:bg-orange-600 text-white font-medium py-2 px-4 rounded-md text-center">
              ??
            </div>
          </div>
        </div>
      )}

      {me?.role === 'owner' && sessionStatus === WalkStatus.Pending && (
        <div className="absolute bottom-0 w-full h-25% rounded-t-xl rounded-b-none bg-wsage p-5">
          <div className='grid items-center justify-center h-full w-full'>
            {avatarUrl ? (
              <img src={avatarUrl} alt={me?.name ?? 'Profile'} className="relative left-1/2 -top-20 transform -translate-x-1/2 max-w-[125px] max-h-[125px] w-full h-auto
                rounded-full border-4 border-yellow-400 object-cover"/>
            ) : (
              <span className="text-white text-xl absolute left-1/2 -translate-x-1/2 -top-16">
                No Image
              </span>
            )}

            <img
              src={logo}
              alt="Logo"
              className="
                absolute          
                top-0 right-0     
                m-5     
                max-h-10         
                max-w-10      
                h-auto
                "
            />

            <p className="absolute inset-x-0 top-20 text-center text-yellow-500 font-bold text-1xl">
              Franklin
            </p>

            <div className='relative w-full -top-5'>
              <Loader />
            </div>

            <div className="bg-orange-500 hover:bg-orange-600 text-white font-medium py-2 px-4 rounded-md text-center">
              REQUESTED
            </div>
          </div>
        </div>
      )}

      {me?.role === 'owner' && sessionStatus === WalkStatus.Accepted && (
        <div className="absolute bottom-0 w-full h-auto rounded-t-xl rounded-b-none bg-wsage p-5">
          <div className='grid items-center justify-center h-full w-full'>
            {avatarUrl ? (
              <img src={avatarUrl} alt={me?.name ?? 'Profile'} className="relative left-1/2 -top-20 transform -translate-x-1/2 max-w-[125px] max-h-[125px] w-full h-auto
                rounded-full border-4 border-yellow-400 object-cover"/>
            ) : (
              <span className="text-white text-xl absolute left-1/2 -translate-x-1/2 -top-16">
                No Image
              </span>
            )}

            <img
              src={logo}
              alt="Logo"
              className="
                absolute          
                top-0 right-0     
                m-5     
                max-h-10         
                max-w-10      
                h-auto
                "
            />

            <p className="absolute inset-x-0 top-20 text-center text-yellow-500 font-bold text-1xl">
              Franklin
            </p>

            <div className="relative w-full -top-5 text-center">
              <p className="text-3xl text-white">ETA: anytime soon</p>
            </div>

            <div
              className="bg-orange-500 hover:bg-orange-600 text-white font-medium py-2 px-4 rounded-md text-center">
              Accepted
            </div>
          </div>
        </div>
      )}


      {me?.role === 'owner' && sessionStatus === WalkStatus.InProgress && (
        <div className="absolute bottom-0 w-full h-auto rounded-t-xl rounded-b-none bg-wsage p-5">
          <div className='grid items-center justify-center h-full w-full'>
            {avatarUrl ? (
              <img src={avatarUrl} alt={me?.name ?? 'Profile'} className="relative left-1/2 -top-20 transform -translate-x-1/2 max-w-[125px] max-h-[125px] w-full h-auto
                rounded-full border-4 border-yellow-400 object-cover"/>
            ) : (
              <span className="text-white text-xl absolute left-1/2 -translate-x-1/2 -top-16">
                No Image
              </span>
            )}

            <img
              src={logo}
              alt="Logo"
              className="
                absolute          
                top-0 right-0     
                m-5     
                max-h-10         
                max-w-10      
                h-auto
                "
            />

            <p className="absolute inset-x-0 top-20 text-center text-yellow-500 font-bold text-1xl">
              Franklin
            </p>

            <div className="relative w-full -top-5 text-center">
              <p className="text-1xl text-white">Your dog is having a very good time.</p>
            </div>

            <div className="bg-orange-500 hover:bg-orange-600 text-white font-medium py-2 px-4 rounded-md text-center">
              Walk in progress
            </div>
          </div>
        </div>
      )}

      {me?.role === 'owner' && sessionStatus === WalkStatus.Rate && (
        <div className="absolute bottom-0 w-full h-auto rounded-t-xl rounded-b-none bg-wsage p-5">
          <div className='grid items-center justify-center h-full w-full'>
            {avatarUrl ? (
              <img src={avatarUrl} alt={me?.name ?? 'Profile'} className="relative left-1/2 -top-20 transform -translate-x-1/2 max-w-[125px] max-h-[125px] w-full h-auto
                rounded-full border-4 border-yellow-400 object-cover"/>
            ) : (
              <span className="text-white text-xl absolute left-1/2 -translate-x-1/2 -top-16">
                No Image
              </span>
            )}

            <img
              src={logo}
              alt="Logo"
              className="
                absolute          
                top-0 right-0     
                m-5     
                max-h-10         
                max-w-10      
                h-auto
                "
            />

            <p className="absolute inset-x-0 top-20 text-center text-yellow-500 font-bold text-1xl">
              Franklin
            </p>

            <div className="relative w-full -top-5 text-left">
              <p className="text-1xl text-white">Dog: Rover</p>

              <p className="text-1xl text-white">Duration: 11:30 - 12:35</p>

              <p className="text-1xl text-white">Activities: Walk</p>
            </div>

            <div className="flex gap-4 justify-center mb-5">
              <p className="text-1xl text-white">Please provide us with a rating.</p>
            </div>

            <form onSubmit={handleRatingFormSubmit}>

              <div className="flex gap-4 justify-center mb-5">
                <Rating
                  style={{ maxWidth: 180 }}
                  value={rating}
                  onChange={(value: number) => {
                    setRatingsFormData(prev => ({ ...prev, rating: value }));
                    setRating(value);
                  }
                  }
                />
              </div>

              <div className='relative w-full h-auto border border-white-300'>
                <input className='text-white w-75 h-50 text-center'
                  type='text'
                  placeholder='Enter your review here.'
                  onChange={(e) => setRatingsFormData(prev => ({ ...prev, description: e.target.value }))}>
                </input>
              </div>

              <div className="flex gap-4 justify-center mt-5">
                <button
                  className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-medium py-2 px-6 rounded-md"
                  type="button"
                  onClick={handleSkipReviewButtonClick}
                >
                  Skip
                </button>

                <button
                  className="bg-orange-500 hover:bg-orange-600 text-white font-medium py-2 px-6 rounded-md"
                  type="submit">
                  Submit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </ProtectedRoute>
  );
}
