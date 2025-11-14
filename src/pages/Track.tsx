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
  activity: string;
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

//calculating times
function displayTime(t: Date) {
  return (t.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  }))
}
function calculateTime(minutes: number) {
  const m = Math.floor(minutes);
  const s = Math.floor((minutes % 1) * 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}


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
  const [other, setOther] = useState<{ id: string; name: string; role: Role } | null>(null);
  const [dog, setDog] = useState<{ id: string; name: string; breed: Role } | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const [session, setSession] = useState<Session | null>(null);
  const [sessionStatus, setSessionStatus] = useState<string>();
  const [start, setStart] = useState<Date>();
  const [end, setEnd] = useState<Date>();


  const [users, setUsers] = useState<UserLocation[]>([]);
  const [myPosition, setMyPosition] = useState<LatLng | null>(null);
  const [path, setPath] = useState<LatLng[]>([]);
  const center = useMemo<LatLng>(() => myPosition ?? { lat: 49.24, lng: -123.05 }, [myPosition]);

  const [isLoaded, setIsLoaded] = useState(false);
  const intervalRef = useRef<number | null>(null);

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

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
      // get me
      const { data: myProfile } = await supabase
        .from('profiles')
        .select('full_name, role, avatar_url')
        .eq('id', user.id)
        .single();
      setMe({ id: user.id, name: myProfile?.full_name ?? '', role: myProfile?.role ?? '' });
      // get session
      const { data: s } = await supabase.from('sessions').select('*').eq('id', sessionId).single();
      setSession(s);
      setSessionStatus(s.status);
      // redirect if no session
      if (!s && myProfile?.role == "walker") {
        navigate('/walker/dashboard');
        return;
      } else if (!s && myProfile?.role == "owner") {
        navigate('/owner/dashboard');
        return;
      }

      //set other
      if (myProfile?.role == 'owner') {
        const { data: otherProfile } = await supabase
          .from('profiles')
          .select('full_name, role, avatar_url')
          .eq('id', s?.walker_id)
          .single();
        setOther({ id: s?.walker_id ?? '', name: otherProfile?.full_name ?? '', role: otherProfile?.role ?? '' });
        // avatar is always other persons
        setAvatarUrl(otherProfile?.avatar_url ?? null);
        console.log(otherProfile)
      } else if (myProfile?.role == 'walker') {
        const { data: otherProfile } = await supabase
          .from('profiles')
          .select('full_name, role, avatar_url')
          .eq('id', s?.owner_id)
          .single();
        setOther({ id: s?.owner_id ?? '', name: otherProfile?.full_name ?? '', role: otherProfile?.role ?? '' });
        // avatar is always other persons
        setAvatarUrl(otherProfile?.avatar_url ?? null);
        console.log(otherProfile)
      }


      const { data: dogData } = await supabase
        .from('pets')
        .select('id, name, breed')
        .eq('id', s?.pet_id)
        .single();

      setDog({ id: dogData?.id, name: dogData?.name, breed: dogData?.breed });

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

  const canStart = session?.status === WalkStatus.Accepted && within20m(ownerPos, walkerPos) && sessionStatus !== WalkStatus.InProgress;

  const canEnd = (() => {
    if (!session || session.status !== WalkStatus.InProgress) return false;
    const end = new Date(session.start_time);
    end.setMinutes(end.getMinutes() + session.duration_minutes);
    return within20m(ownerPos, walkerPos) && new Date() >= end;
  })();

  const startWalk = async () => {
    if (!session) return;

    await supabase.from('sessions')
      .update({ status: WalkStatus.InProgress, start_time: Date.now() })
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

    const { data } = await supabase
      .from('sessions')
      .update({
        status: WalkStatus.Rate,
        end_time: Date.now()
      })
      .select('start_time, end_time')
      .eq('id', session.id);

    const row = data![0];

    setStart(new Date(row.start_time));
    setEnd(new Date(row.end_time));

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

      if (data != null && data.status == WalkStatus.Rate) {
        setSessionStatus(WalkStatus.Rate);
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
          style={{ width: '100vw', height: '78%' }}
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

      <div className='absolute z-50 left-1/2 top-[65%] -translate-x-1/2 '>
        <div className="
                w-[125px] h-[125px] rounded-full 
                border-4 border-yellow-400 
                bg-gray-700 flex items-center justify-center">

          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={me?.name ?? 'Profile'}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            <span className="text-white text-sm">No Image</span>
          )}
        </div>
        <p className="text-center text-yellow-500 font-bold text-1xl p-3">
          {other?.name}
        </p>
      </div>

      <div className="absolute bottom-0 w-full h-1/4 rounded-t-xl bg-wsage p-5">
        <div className="flex flex-col items-center justify-center h-full w-full space-y-4">

          <div className="flex flex-row items-center justify-between w-full">
            {me?.role === 'owner' && (
              <div className="invisible">
                <button>
                  Placeholder
                </button>
              </div>
            )}

            {me?.role === 'walker' && sessionStatus === WalkStatus.Accepted && (
              <button
                onClick={startWalk}
                disabled={!canStart}
                className={`px-3 py-1 rounded text-white ${canStart ? "bg-blue-600" : "bg-gray-400 cursor-not-allowed"
                  }`}
              >
                Start Walk
              </button>
            )}

            {me?.role === 'walker' && sessionStatus === WalkStatus.InProgress && (
              <button
                onClick={endWalk}
                disabled={!canEnd}
                className={`px-3 py-1 rounded text-white ${canEnd ? "bg-blue-600" : "bg-gray-400 cursor-not-allowed"
                  }`}
              >
                End Walk
              </button>
            )}
            <img
              src={logo}
              alt="Logo"
              className="max-h-10 max-w-10 h-auto"
            />
          </div>

          {me?.role === 'owner' && sessionStatus === WalkStatus.Pending && (
            <div className="w-full flex justify-center">
              <Loader />
            </div>
          )}
          {me?.role === 'walker' && sessionStatus === WalkStatus.Pending && (
            <div className="invisible w-full flex justify-center">
              <Loader />
            </div>
          )}
          {sessionStatus === WalkStatus.Pending && (
            <div className="text-white font-medium py-2 px-4 rounded-md text-center">
              REQUESTED
            </div>
          )}

          {me?.role === 'owner' && sessionStatus === WalkStatus.Accepted && (
            <div className="text-white font-medium py-2 px-4 rounded-md text-center">
              ETA: {haversine(ownerPos!, walkerPos!) / 100}
            </div>
          )}
          {me?.role === 'walker' && sessionStatus === WalkStatus.Accepted && (
            <div className="invisible text-white font-medium py-2 px-4 rounded-md text-center">
              ETA: {haversine(ownerPos!, walkerPos!) / 100}
            </div>
          )}
          {sessionStatus === WalkStatus.Accepted && (
            <div className="text-white font-medium py-2 px-4 rounded-md text-center">
              ACCEPTED
            </div>
          )}

          {me?.role === 'owner' && sessionStatus === WalkStatus.InProgress && (
            <div className="text-white font-medium py-2 px-4 rounded-md text-center">
              TIME REMAINING: {calculateTime((Date.now() - start!.getTime()) / 60000)}
            </div>
          )}
          {me?.role === 'walker' && sessionStatus === WalkStatus.InProgress && (
            <div className="invisible text-white font-medium py-2 px-4 rounded-md text-center">
              TIME REMAINING: {calculateTime((Date.now() - start!.getTime()) / 60000)}
            </div>
          )}
          {sessionStatus === WalkStatus.InProgress && (
            <div className="text-white font-medium py-2 px-4 rounded-md text-center">
              IN PROGRESS
            </div>
          )}

          {me?.role === 'owner' && sessionStatus === WalkStatus.Rate && (
            <div className="relative w-full -top-5 text-left">
              <p className="text-1xl text-white">Dog: {dog?.name}</p>
              <p className="text-1xl text-white">Breed: {dog?.breed}</p>
              <p className="text-1xl text-white">Duration: {displayTime(start!)} - {displayTime(end!)}</p>
              {session?.activity && (
                <p className="text-1xl text-white">Activities: {session.activity}</p>
              )}
            </div>
          )}
          {me?.role === 'owner' && sessionStatus === WalkStatus.Rate && (
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
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
