import { useEffect, useState } from 'react'
import './App.css'
import { GoogleMap, useJsApiLoader, Marker} from '@react-google-maps/api';
import ProtectedRoute from '../auth/ProtectedRoute.tsx'
import { supabase } from '../supabaseClient.ts';
import { useNavigate } from 'react-router';

export default function App() {
  const [isTracking, setIsTracking] = useState(false);
  const [myPosition, setMyPosition] = useState<{ lat: number; lng: number } | null>(null);

  const [userID, setUserID] = useState("");
  const [userName, setUserName] = useState("");
  const [userRole, setUserRole] = useState("");
  const [users, setUsers] = useState<UserLocation[]>([]);

  const [clickedUser, setClickedUser] = useState<UserLocation | null>(null);

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
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('full_name, role')
        .eq('id', user?.id)
        .single();

      // console.log(user?.id)
      // console.log(profile);

      setUserID(user?.id ?? "");
      setUserName(profile?.full_name)
      setUserRole(profile?.role)

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        return null;
      }
    };

    fetchUser();

    const updateUserLocation = (updateLocation: UserLocation) => {
      console.log(updateLocation)
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
        console.log('received payload: ', payload.payload, '\n\n')
        const tempUserLocation: UserLocation = {
          userID: payload.payload.userID,
          role: payload.payload.role,
          name: payload.payload.name,
          position: payload.payload.position,
          timestamp: payload.payload.timestamp,
        }
        updateUserLocation(tempUserLocation)
      })
      .subscribe();


    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    console.log("Updated users: ", users);
  }, [users]);

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
        console.log("My broadcasted position: ", newPosition, '\n')
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

  //dummy users for testing
  const testUsers:UserLocation[] = [
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
          {allUsers.map((user) => {
            const getMarkerColor = (role: string) => {
                switch (role) {
                  case 'Walker': return '#007BFF';
                  case 'Owner': return '#28A745';
                  default: return '#6C757D'; // Gray for unknown roles
                }
              };
            const markerColor = getMarkerColor(user.role);
          return (
            <Marker
              key={user.userID}
              position={user.position}
              clickable={true}
              onClick={() => {
                console.log("clicked user: ", user);
                console.log("color: ", markerColor);
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
            >
            </Marker>
          )})}

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
      </>
    </ProtectedRoute>
  )
}