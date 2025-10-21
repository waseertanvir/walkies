import { useEffect, useState } from 'react'
import { APIProvider, Map, Marker, AdvancedMarker } from '@vis.gl/react-google-maps';
import ProtectedRoute from '../../auth/ProtectedRoute.tsx'
import { supabase } from '../../supabaseClient.ts';
import { useNavigate } from 'react-router';
import OwnerMenu from '../../components/ownerMenu.tsx';

export default function App() {
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
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    console.log("Updated users: ", users);
  }, [users]);

  const mapContainerStyle = {
    height: "100vh",
    width: "100vw"
  };

  const center = myPosition ?? { lat: 49.24, lng: -123.05 };

  //dummy users for testing
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
    {
      userID: '3',
      role: 'Walker',
      name: 'guy2',
      position: { lat: 49.271, lng: -123.251 },
      timestamp: new Date(),
    },
  ];

  const allUsers = [...users, ...testUsers];

  return (
    <ProtectedRoute>
      <OwnerMenu />

      <APIProvider apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}>
        <Map
          mapId={import.meta.env.VITE_GOOGLE_MAP_ID}
          style={{ width: '100vw', height: '100vh' }}
          defaultCenter={center}
          defaultZoom={15}
          disableDefaultUI={true}
          clickableIcons={false}
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
              <AdvancedMarker
                key={user.userID}
                position={user.position}
                onClick={() => setClickedUser(user)}
              >
                {/* Custom circular marker */}
                <div
                  style={{
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    backgroundColor: markerColor,
                    border: '2px solid white',
                  }}
                />
              </AdvancedMarker>
            );
          })}

          {myPosition && (
            <AdvancedMarker
              position={myPosition}
              onClick={() => console.log('clicked my position: ', myPosition)}
            >
              <div
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  backgroundColor: '#FE7F2D',
                  border: '3px solid white',
                }}
              />
            </AdvancedMarker>
          )}
        </Map>
        <div className="absolute bottom-0 rounded-t-xl rounded-b-none bg-wsage w-full h-[10vh] flex justify-center items-center gap-20">
          {clickedUser && (
            <div className="status-box">
              <p>name: {clickedUser.name}</p>
              <p>role: {clickedUser.role}</p>
              <button onClick={() => setClickedUser(null)} className="close-button">
                Close
              </button>
            </div>
          )}
          {!clickedUser && (
            <div className='flex justify-center items-center gap-20'>
              <button className="p-4 rounded-3xl bg-worange" onClick={() => navigate("/owner/broadcast")}>
                Broadcast
              </button>
              <button className="p-4 rounded-3xl bg-worange" onClick={() => navigate("/owner/schedule")}>
                Schedule
              </button>
            </div>
          )}
        </div>

      </APIProvider>
    </ProtectedRoute>
  );
}