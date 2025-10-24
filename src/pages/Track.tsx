import { useEffect, useState } from 'react';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';
import { supabase } from '../supabaseClient';
import ProtectedRoute from '../auth/ProtectedRoute';
import { useNavigate } from 'react-router';
import { Button } from '../components/ui';

type UserLocation = {
  userID: string;
  role: string;
  name: string;
  position: { lat: number; lng: number };
  timestamp: Date;
};

export default function Track() {
  const navigate = useNavigate();
  const [isTracking, setIsTracking] = useState(false);
  const [myPosition, setMyPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [userID, setUserID] = useState("");
  const [userName, setUserName] = useState("");
  const [userRole, setUserRole] = useState("");
  const [users, setUsers] = useState<UserLocation[]>([]);
  const [clickedUser, setClickedUser] = useState<UserLocation | null>(null);
  const [hasActiveRequest, setHasActiveRequest] = useState(false);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY
  });

  useEffect(() => {
    const checkActiveRequest = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: activeRequest } = await supabase
        .from('sessions')
        .select('*')
        .or(`owner_id.eq.${user.id},walker_id.eq.${user.id}`)
        .in('status', ['accepted', 'in_progress'])
        .single();

      console.log(activeRequest)
      if (!activeRequest) {
        navigate('/');
        return;
      }

      setHasActiveRequest(true);
    };

    checkActiveRequest();
  }, [navigate]);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, role')
        .eq('id', user?.id)
        .single();

      setUserID(user?.id ?? "");
      setUserName(profile?.full_name ?? "");
      setUserRole(profile?.role ?? "");
    };

    fetchUser();

    const updateUserLocation = (updateLocation: UserLocation) => {
      setUsers(prevUsers => {
        const index = prevUsers.findIndex(u => u.userID === updateLocation.userID);
        if (index !== -1) {
          const updatedUsers = [...prevUsers];
          updatedUsers[index] = { ...updatedUsers[index], ...updateLocation };
          return updatedUsers;
        } else {
          return [...prevUsers, updateLocation];
        }
      });
    };

    const channel = supabase
      .channel("liveLocations")
      .on('broadcast', { event: "location" }, (payload) => {
        const tempUserLocation: UserLocation = {
          userID: payload.payload.userID,
          role: payload.payload.role,
          name: payload.payload.name,
          position: payload.payload.position,
          timestamp: payload.payload.timestamp,
        };
        updateUserLocation(tempUserLocation);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setMyPosition({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.error("Error getting location: ", error);
        }
      );
    }

    const sendLocation = async (updatedPosition: any) => {
      await supabase
        .channel("liveLocations")
        .send({
          type: "broadcast",
          event: "location",
          payload: {
            userID: userID,
            role: userRole,
            name: userName,
            position: updatedPosition,
            timestamp: new Date().toISOString(),
          },
        });
    };

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const newPosition = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        setMyPosition(newPosition);
        sendLocation(newPosition);
      },
      (error) => {
        console.error("Error watching location: ", error);
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [isTracking, userID, userRole, userName]);

  const mapContainerStyle = {
    height: "100vh",
    width: "100vw"
  };

  const center = myPosition ?? { lat: 49.24, lng: -123.05 };

  if (!isLoaded) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-wblue flex items-center justify-center">
          <div className="text-white text-xl">Loading map...</div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!hasActiveRequest) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-wblue flex items-center justify-center">
          <div className="text-white text-xl">No active walk to track</div>
        </div>
      </ProtectedRoute>
    );
  }

  const testUsers: UserLocation[] = [
    {
      userID: '1',
      role: 'Walker',
      name: 'guy1',
      position: { lat: 49.245, lng: -123.05 },
      timestamp: new Date(),
    },
    {
      userID: '2',
      role: 'Owner',
      name: 'girl1',
      position: { lat: 49.243, lng: -123.052 },
      timestamp: new Date(),
    },
  ];

  const allUsers = [...users, ...testUsers];

  return (
    <ProtectedRoute>
      <div className="relative">
        <div className="absolute top-4 left-4 z-10 flex gap-4">
          <Button
            onClick={() => setIsTracking(!isTracking)}
            variant={isTracking ? 'primary' : 'secondary'}
          >
            {isTracking ? 'Stop Tracking' : 'Start Tracking'}
          </Button>
          <Button onClick={() => navigate('/')} variant="secondary">
            Back to Dashboard
          </Button>
        </div>

        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={center}
          zoom={isTracking ? 15 : 13}
        >
          {allUsers.map((user) => {
            const getMarkerColor = (role: string) => {
              switch (role) {
                case 'Walker': return '#007BFF';
                case 'Owner': return '#28A745';
                default: return '#6C757D';
              }
            };
            const markerColor = getMarkerColor(user.role);
            return (
              <Marker
                key={user.userID}
                position={user.position}
                clickable={true}
                onClick={() => {
                  setClickedUser(user);
                }}
                icon={{
                  path: window.google.maps.SymbolPath.CIRCLE,
                  fillColor: markerColor,
                  fillOpacity: 0.8,
                  strokeColor: "#ffffff",
                  strokeWeight: 2,
                  scale: 8
                }}
              />
            );
          })}

          {isTracking && myPosition && (
            <Marker
              position={myPosition}
              onClick={() => {
                console.log("clicked my position: ", myPosition);
              }}
              icon={{
                path: window.google.maps.SymbolPath.CIRCLE,
                fillColor: '#FE7F2D',
                fillOpacity: 0.8,
                strokeColor: '#ffffff',
                strokeWeight: 3,
                scale: 10
              }}
            />
          )}

          {clickedUser && (
            <div className="status-box">
              <p>name: {clickedUser.name} </p>
              <p>role: {clickedUser.role} </p>
              <button onClick={() => setClickedUser(null)} className="close-button">Close</button>
            </div>
          )}
        </GoogleMap>
      </div>
    </ProtectedRoute>
  );
}
