import { useEffect, useState } from 'react'
import { APIProvider, Map, AdvancedMarker } from '@vis.gl/react-google-maps';
import ProtectedRoute from '../../auth/ProtectedRoute.tsx'
import { supabase } from '../../supabaseClient.ts';
import { useLocation, useNavigate } from 'react-router';
import OwnerMenu from '../../components/ownerMenu.tsx';
import profileBanner from '../../assets/profile_banner.png';
import '../App.css'
import { useDeviceState } from "../../DeviceStateContext";
import logo from '../../assets/Logo.png'
import Loader from "../../Loader";

export default function App() {
  const [myPosition, setMyPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [userID, setUserID] = useState("");
  const [userName, setUserName] = useState("");
  const [userRole, setUserRole] = useState("");
  const [users, setUsers] = useState<UserLocation[]>([]);
  const [clickedUser, setClickedUser] = useState<UserLocation | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [touchStart, setTouchStart] = useState(0);

  const navigate = useNavigate();
  const location = useLocation();
  const center = myPosition ?? { lat: 49.24, lng: -123.05 };
  const [mapCenter, setMapCenter] = useState(center);
  const { state } = useDeviceState();
  const [loading, setLoading] = useState(true);

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


  // touch handlers for swipe feature on popup
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientY);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchEnd = e.changedTouches[0].clientY;
    const diff = touchStart - touchEnd;

    if (diff > 50 && clickedUser) { // Swiped up
      navigate(`/owner/walker/${clickedUser.userID}`, { state: { user: clickedUser } });
    }
  };

  // restores state after back click from walkerProfile
  useEffect(() => {
    if (location.state?.selectedUser) {
      setClickedUser(location.state.selectedUser);
      setMapCenter(location.state.selectedUser.position);
    } else {
      setMapCenter(center);
    }
  }, [location.state]);


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
          defaultCenter={mapCenter}
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
                onClick={() => {
                  setClickedUser(user);
                  setMapCenter(user.position);
                }
                }
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

        {clickedUser && (
          <div className={`status-container ${isExpanded ? 'expanded' : ''}`}>
            <img
              src={profileBanner}
              alt={clickedUser.name}
              className="status-image"
            />
            <div
              className="status-box"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              onClick={() => clickedUser && navigate(`/owner/walker/${clickedUser.userID}`, { state: { user: clickedUser } })}
            >
              <div className="header">
                <span className="name">{clickedUser.name}</span>
                <div className="rating">
                  <span>★</span>
                  <span>4.53 (12)</span>
                </div>
              </div>
              <button className="request-button" onClick={() => setClickedUser(null)}>
                Details
              </button>
              <div className="details">
                <span className="price">${'30'} per dog</span>
                <span className="capacity">Capacity {'2/3'} Dogs</span>
              </div>
            </div>
          </div>
        )}

        {!clickedUser && state == "IDLE" && (
          <div className="absolute bottom-0 rounded-t-xl rounded-b-none bg-wsage w-full h-[10vh] flex justify-center items-center gap-20">
            <div>
              <button className="p-4 mr-2 rounded-3xl bg-worange" onClick={() => navigate("/owner/broadcast")}>
                Broadcast
              </button>
              <button className="p-4 ml-2 rounded-3xl bg-worange" onClick={() => navigate("/owner/schedule")}>
                Schedule
              </button>
            </div>
          </div>
        )}

        {!clickedUser && state === 'WAITING_FOR_WALKER' && (
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

              <div className='relative w-full -top-5'>
                <Loader />
              </div>

              <div className="bg-orange-500 hover:bg-orange-600 text-white font-medium py-2 px-4 rounded-md text-center">
                REQUESTED
              </div>
            </div>
          </div>
        )}

        {!clickedUser && state === 'WALKER_HAS_ACCEPTED' && (
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
                <p className="text-3xl text-white">ETA 11:30</p>
              </div>

              <div className="bg-orange-500 hover:bg-orange-600 text-white font-medium py-2 px-4 rounded-md text-center">
                ACCEPTED
              </div>
            </div>
          </div>
        )}

      </APIProvider>
    </ProtectedRoute>
  );
}