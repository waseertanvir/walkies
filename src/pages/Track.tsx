import { useEffect, useRef, useState, useMemo } from 'react';
import { APIProvider, Map, AdvancedMarker, useMap } from '@vis.gl/react-google-maps';
import { supabase } from '../supabaseClient';
import ProtectedRoute from '../auth/ProtectedRoute';
import { useNavigate, useParams } from 'react-router';
import OwnerMenu from '../components/ownerMenu';
import WalkerMenu from '../components/walkerMenu';

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
  const [isWalking, setIsWalking] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const center = useMemo<LatLng>(() => myPosition ?? { lat: 49.24, lng: -123.05 }, [myPosition]);

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
      setIsWalking(s.status === 'in_progress');
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
      if (session?.walker_id && p.userID === session.walker_id && isWalking) {
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
  }, [me, session, isWalking]);

  const ownerPos = users.find((u) => u.role === 'owner')?.position ?? null;
  const walkerPos = users.find((u) => u.role === 'walker')?.position ?? null;
  const iAmWalker = me?.role === 'walker' && session?.walker_id === me.id;

  const canStart =
    iAmWalker && session?.status === 'accepted' && within10m(ownerPos, walkerPos) && !isWalking;

  const canEnd = (() => {
    if (!session || !iAmWalker || session.status !== 'in_progress') return false;
    const end = new Date(session.start_time);
    end.setMinutes(end.getMinutes() + session.duration_minutes);
    return within10m(ownerPos, walkerPos) && new Date() >= end;
  })();

  //start button
  const startWalk = async () => {
    if (!session) return;
    await supabase.from('sessions').update({ status: 'in_progress' }).eq('id', session.id);
    setSession({ ...session, status: 'in_progress' });
    setIsWalking(true);
    setPath([]);
  };

  //endbutton
  const endWalk = async () => {
    if (!session) return;
    await supabase.from('sessions').update({ status: 'completed' }).eq('id', session.id);
    setSession({ ...session, status: 'completed' });
    setIsWalking(false);
  };

  if (!isLoaded)
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-wblue flex items-center justify-center">
          <div className="text-white text-xl">Loading map…</div>
        </div>
      </ProtectedRoute>
    );

  return (
    <ProtectedRoute>
      {me?.role === 'owner' && <OwnerMenu />}
      {me?.role === 'walker' && <WalkerMenu />}

      <div className="absolute top-3 right-3 z-10 bg-white p-3 rounded-lg shadow">
        <div>Status: {session?.status}</div>
        <button
          onClick={startWalk}
          disabled={!canStart}
          className={`mt-2 px-3 py-1 rounded ${canStart ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'
            }`}
        >
          Start Walk
        </button>
        <button
          onClick={endWalk}
          disabled={!canEnd}
          className={`mt-2 px-3 py-1 rounded ${canEnd ? 'bg-green-600 text-white' : 'bg-gray-300 text-gray-600'
            }`}
        >
          End Walk
        </button>
      </div>

      <APIProvider apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}>
        <Map
          mapId={import.meta.env.VITE_GOOGLE_MAP_ID}
          style={{ width: '100vw', height: '100vh' }}
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

          {isWalking && path.length > 1 && <WalkerPath path={path} />}
        </Map>
      </APIProvider>
    </ProtectedRoute>
  );
}
