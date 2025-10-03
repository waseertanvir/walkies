import { useEffect, useState } from 'react'
import './App.css'
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';
import dogIcon from '../assets/Logo.png'
import ProtectedRoute from '../auth/ProtectedRoute.tsx'
import { supabase } from '../supabaseClient.ts';
import { useNavigate } from 'react-router';

export default function App() {
  const [selectedMarker, setSelectedMarker] = useState<number | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [myPosition, setMyPosition] = useState<{ lat: number; lng: number } | null>(null);

  const [userID, setUserID] = useState("");
  const [userName, setUserName] = useState("");
  const [userRole, setUserRole] = useState("");
  const [users, setUsers] = useState<UserLocation[]>([]);

  const navigate = useNavigate();

  type UserLocation = {
    userID: string,
    role: string,
    name: string,
    position: { lat: number; lng: number },
    timestamp: Date,
  };


  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY
  });

  // on load effects
  useEffect(() => {
    //get user data
    const fetchSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUserID(session?.user?.id ?? "");
      setUserName(session?.user?.email ?? "");
      setUserRole(session?.user?.role ?? "");
    };

    fetchSession();

    const updateUserLocation = (updateLocation: UserLocation) => {
      setUsers(prevUsers => {
        const index = prevUsers.findIndex(u => u.userID === updateLocation.userID);

        if (index !== -1) {
          // Update existing user
          const updatedUsers = [...prevUsers];
          updatedUsers[index] = { ...updatedUsers[index], ...updateLocation };
          return updatedUsers;
        } else {
          // Add new user
          return [...prevUsers, updateLocation];
        }
      });
    };

    const channel = supabase
      .channel("liveLocations")
      .on('broadcast', { event: "location" }, (payload) => {
        // only shows roles different from user
        if (payload.role !== userRole) {
          const tempUserLocation: UserLocation = {
            userID: payload.userID,
            role: payload.role,
            name: payload.name,
            position: payload.position,
            timestamp: payload.timestamp
          }
          updateUserLocation(tempUserLocation)
        }
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
      //broadcast user position to realtime
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
    }
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        // update user position
        const newPosition = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        setMyPosition(newPosition);

        //broadcast location
        sendLocation(newPosition)
      },
      (error) => {
        console.error("Error watching location: ", error);
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
    );
    return () => {
      navigator.geolocation.clearWatch(watchId);
      console.log("Stopped tracking location.");
    }
  }, [isTracking]);


  const mapContainerStyle = {
    height: "100vh",
    width: "100vw"
  };
  const center = myPosition && isTracking
    ? myPosition
    : { lat: 49.24, lng: -123.05 };

  if (!isLoaded) {
    return <div>Loading map...</div>;
  }

  return (
    <ProtectedRoute>
      <>
        <div className="flex gap-4 p-4">
          <button
            onClick={() => setIsTracking(!isTracking)}
            className={`px-4 py-2 rounded-md text-white ${isTracking ? 'bg-orange-500' : 'bg-blue-500'}`}
          >
            {isTracking ? 'Stop Tracking' : 'Start Tracking'}
          </button>

          <button
            onClick={async () => {
              await supabase.auth.signOut();
              
              navigate('/login')
            }}
            className="px-4 py-2 rounded-md bg-red-500 text-white"
          >
            Sign Out
          </button>
        </div>
        {/* {isTracking && myPosition && (
          <div className="status-box">
            timer and other info here
          </div>
        )} */}

        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={center}
          zoom={isTracking ? 15 : 13}
        >
          {users.map((user) => (
            <Marker
              key={user.userID}
              position={user.position}
              icon={{
                path: window.google.maps.SymbolPath.CIRCLE,
                fillColor: user.userID === userID ? "#FE7F2D" : "#007BFF",
                fillOpacity: 0.8,
                strokeColor: "#ffffff",
                strokeWeight: 2,
                scale: 8
              }}
            >
            </Marker>
          ))}
          {isTracking && myPosition && (
            <Marker
              position={myPosition}
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

        </GoogleMap>
      </>
    </ProtectedRoute>
  )
}