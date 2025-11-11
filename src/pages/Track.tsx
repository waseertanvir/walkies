import { useEffect, useRef, useState, useMemo } from 'react';
import { APIProvider, Map, AdvancedMarker, useMap } from '@vis.gl/react-google-maps';
import { supabase } from '../supabaseClient';
import ProtectedRoute from '../auth/ProtectedRoute';
import { useNavigate, useParams } from 'react-router';
import OwnerMenu from '../components/ownerMenu';
import WalkerMenu from '../components/walkerMenu';
import { TrajectoryLine } from '../components/TrajectoryLine';
import { useDeviceState } from "../DeviceStateContext";
import logo from '../assets/Logo.png'
import Loader from "../Loader";
const WALK_IN_PROGRESS = 'walk_in_progress';
const WALK_COMPLETED = 'walk_completed';

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
const within10m = (a?: LatLng | null, b?: LatLng | null) =>
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

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const center = useMemo<LatLng>(() => myPosition ?? { lat: 49.24, lng: -123.05 }, [myPosition]);
  const { state, setState } = useDeviceState();

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, role')
        .eq('id', user.id)
        .single();

      setMe({ id: user.id, name: profile?.full_name ?? '', role: profile?.role ?? '' });

      const { data: s } = await supabase.from('sessions').select('*').eq('id', sessionId).single();
      if (!s) {
        navigate('/walker/dashboard');
        return;
      }

      setSession(s);
      /**
       * TODO: This is one of the ways app is maintaining state. We need to find a single way to make use of state.
       */
      setSessionStatus(WALK_IN_PROGRESS);
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
      if (session?.walker_id && p.userID === session.walker_id && sessionStatus === WALK_IN_PROGRESS) {
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
  }, [me, session, sessionStatus === WALK_IN_PROGRESS]);

  const ownerPos = users.find((u) => u.role === 'owner')?.position ?? null;
  const walkerPos = users.find((u) => u.role === 'walker')?.position ?? null;
  const iAmWalker = me?.role === 'walker' && session?.walker_id === me.id;

  const canStart =
    iAmWalker && session?.status === 'accepted' && within10m(ownerPos, walkerPos) && sessionStatus !== WALK_IN_PROGRESS;

  const canEnd = (() => {
    if (!session || !iAmWalker || session.status !== WALK_IN_PROGRESS) return false;
    const end = new Date(session.start_time);
    end.setMinutes(end.getMinutes() + session.duration_minutes);
    return within10m(ownerPos, walkerPos) && new Date() >= end;
  })();

  const startWalk = async () => {
    if (!session) return;

    await supabase.from('sessions')
      .update({ status: WALK_IN_PROGRESS })
      .eq('id', session.id);

    setSession({ ...session, status: WALK_IN_PROGRESS });
    setSessionStatus(WALK_IN_PROGRESS)
    startInterval();
  };

  const startInterval = async () => {
    if (intervalRef.current !== null) return;
    intervalRef.current = window.setInterval(() => {
      if (myPosition != null) {
        console.log("Latitide: " + myPosition.lat + ", Longitude: " + myPosition.lng);

        addPath(myPosition);

        /**
         * This whole function call can be replaced via a POST REST call.
         */
        supabase
          .from('session_detail')
          .insert({ session_id: sessionId, lat: myPosition.lat, long: myPosition.lng })
          .then(({ data, error }) => {
            if (error) {
              console.error("Insert failed:", error);
            } else {
              console.log("Insert succeeded:", data);
            }
          });
      }
    }, 2000);
  };

  const addPath = (point: LatLng) => {
    setPath(prev => [...prev, point]);
  };

  const stopInterval = () => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const endWalk = async () => {
    if (!session) return;
    await supabase.from('sessions').update({ status: 'completed' }).eq('id', session.id);
    setSession({ ...session, status: 'completed' });
    setSessionStatus(WALK_COMPLETED);
    stopInterval();
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

      if (data.walker_id != null) {
        stopCheckingForWalkerRequests();
        setState("WALKER_HAS_ACCEPTED");
      }

    }, 2000);

  };

  const handleAcceptedRequestNextButtonClick = () => {
    setState("WALK_IN_PROGRESS");
  }

  const stopCheckingForWalkerRequests = () => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  if (state == "WAITING_FOR_WALKER") {
    startCheckingForWalkerRequests()
  }

  return (
    <ProtectedRoute>
      {me?.role === 'owner' && <OwnerMenu />}
      {me?.role === 'walker' && <WalkerMenu />}

      {me?.role === 'walker' &&
        <div className="absolute top-3 right-3 z-10 bg-white p-3 rounded-lg shadow">
          <div>Status: {session?.status}</div>
          <button
            onClick={startWalk}
/*          The following buttons are temporarily enabled for testing. Please remove this comment before final testing. 
            disabled={!canStart}
 */          className={`mt-2 px-3 py-1 rounded ${true ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'
              }`}
          >
            Start Walk
          </button>
          <button
            onClick={endWalk}
/*        The following buttons are temporarily enabled for testing. Please remove this comment before final testing.  
          disabled={!canEnd}
 */          className={`mt-2 px-3 py-1 rounded ${true ? 'bg-green-600 text-white' : 'bg-gray-300 text-gray-600'
              }`}
          >
            End Walk
          </button>
        </div>
      }

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

          {sessionStatus === WALK_IN_PROGRESS && path.length > 1 && <WalkerPath path={path} />}
        </Map>
      </APIProvider>

      {me?.role === 'owner' && state === 'WAITING_FOR_WALKER' && (
        <div className="absolute bottom-0 w-full h-25% rounded-t-xl rounded-b-none bg-wsage p-5">
          <div className='grid items-center justify-center h-full w-full'>
            <img
              className="
                relative
                left-1/2
                -top-20
                transform -translate-x-1/2
                max-w-[125px] max-h-[125px] w-full h-auto
                rounded-full border-4 border-yellow-400 object-cover
                "
              src="https://m.gettywallpapers.com/wp-content/uploads/2023/09/Grand-Theft-Auto-5-Profile-Picture.jpg"
              alt="Franklin with Chop."
            />

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

      {me?.role === 'owner' && state === 'WALKER_HAS_ACCEPTED' && (
        <div className="absolute bottom-0 w-full h-auto rounded-t-xl rounded-b-none bg-wsage p-5">
          <div className='grid items-center justify-center h-full w-full'>
            <img
              className="
                relative
                left-1/2
                -top-20
                transform -translate-x-1/2
                max-w-[125px] max-h-[125px] w-full h-auto
                rounded-full border-4 border-yellow-400 object-cover
                "
              src="https://m.gettywallpapers.com/wp-content/uploads/2023/09/Grand-Theft-Auto-5-Profile-Picture.jpg"
              alt="Franklin with Chop."
            />

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
              <p className="text-3xl text-white">Walk Accepted</p>
            </div>

            <button
              className="bg-orange-500 hover:bg-orange-600 text-white font-medium py-2 px-4 rounded-md text-center"
              onClick={handleAcceptedRequestNextButtonClick}>
              Next
            </button>
          </div>
        </div>
      )}


      {me?.role === 'owner' && sessionStatus === WALK_IN_PROGRESS && (
        <div className="absolute bottom-0 w-full h-auto rounded-t-xl rounded-b-none bg-wsage p-5">
          <div className='grid items-center justify-center h-full w-full'>
            <img
              className="
                relative
                left-1/2
                -top-20
                transform -translate-x-1/2
                max-w-[125px] max-h-[125px] w-full h-auto
                rounded-full border-4 border-yellow-400 object-cover
                "
              src="https://m.gettywallpapers.com/wp-content/uploads/2023/09/Grand-Theft-Auto-5-Profile-Picture.jpg"
              alt="Franklin with Chop."
            />

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


      {me?.role === 'owner' && state === 'RATE_WALK' && (
        <div className="absolute bottom-0 w-full h-auto rounded-t-xl rounded-b-none bg-wsage p-5">
          <div className='grid items-center justify-center h-full w-full'>
            <img
              className="
                relative
                left-1/2
                -top-20
                transform -translate-x-1/2
                max-w-[125px] max-h-[125px] w-full h-auto
                rounded-full border-4 border-yellow-400 object-cover
                "
              src="https://m.gettywallpapers.com/wp-content/uploads/2023/09/Grand-Theft-Auto-5-Profile-Picture.jpg"
              alt="Franklin with Chop."
            />

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

            <div className='relative w-full h-auto border border-white-300'>
              <input className='text-white w-75 h-50 text-center' type='text' placeholder='Enter your review here.'>
              </input>
            </div>

            {/* Flex container that holds both buttons */}
            <div className="flex gap-4 justify-center mt-5">
              <button
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-medium py-2 px-6 rounded-md"
                type="button"
              >
                Skip
              </button>

              <button
                className="bg-orange-500 hover:bg-orange-600 text-white font-medium py-2 px-6 rounded-md"
                type="submit"
              >
                Submit
              </button>
            </div>

          </div>
        </div>
      )}
    </ProtectedRoute>
  );
}
