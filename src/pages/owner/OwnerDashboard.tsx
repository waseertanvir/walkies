import { useEffect, useState, useRef } from 'react'
import { APIProvider, Map, AdvancedMarker } from '@vis.gl/react-google-maps';
import ProtectedRoute from '../../auth/ProtectedRoute.tsx'
import { supabase } from '../../supabaseClient.ts';
import { useLocation, useNavigate } from 'react-router';
import OwnerMenu from '../../components/ownerMenu.tsx';
import profileBanner from '../../assets/profile_banner.png';
import '../App.css'
import { Button } from '../../components/ui';
import { WalkStatus } from '../../constants/WalkStatus.tsx';

type ActiveWalk = { session: string; dog: string };

export default function App() {
  const [myPosition, setMyPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [userID, setUserID] = useState("");
  const [userName, setUserName] = useState("");
  const [userRole, setUserRole] = useState("");
  const [users, setUsers] = useState<UserLocation[]>([]);
  const [clickedUser, setClickedUser] = useState<UserLocation | null>(null);
  const [clickedRating, setClickedRating] = useState<{ rating: number; count: number } | null>(null);
  const [activeWalks, setActiveWalks] = useState<ActiveWalk[] | null>(null);

  const [isExpanded, setIsExpanded] = useState(false);
  const [touchStart, setTouchStart] = useState(0);

  const navigate = useNavigate();
  const location = useLocation();
  const center = myPosition;
  const [mapCenter, setMapCenter] = useState(center);

  type UserLocation = {
    userID: string,
    role: string,
    name: string,
    position: { lat: number; lng: number },
    timestamp: Date,
  };

  // on load effects
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel>;

    //get user data
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('full_name, role')
        .eq('id', user?.id)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        return null;
      }
      if (user && profile) {
        setUserID(user.id);
        setUserName(profile.full_name)
        setUserRole(profile.role)
      }

      // get active walks
      const { data: walks, error: walksError } = await supabase
        .from("sessions")
        .select("id, pet_id")
        .eq("owner_id", user?.id)
        .eq("status", WalkStatus.InProgress);

      if (walksError) {
        console.error("Error fetching walks:", walksError);
        return;
      }
      console.log('WALKS', user, walks)

      if (!walks || walks.length === 0) {
        setActiveWalks(null);
      } else {
        // get dog names
        const results: ActiveWalk[] = await Promise.all(
          walks.map(async (walk) => {
            const { data: pet, error: petError } = await supabase
              .from("pets")
              .select("name")
              .eq("id", walk.pet_id)
              .single();

            if (petError) {
              console.error("Error fetching pet:", petError);
              return { session: walk.id, dog: "Unknown" };
            }

            return { session: walk.id, dog: pet?.name || "Unknown" };
          })
        );
        setActiveWalks(results);
      }

      channel = supabase
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

      const sendLocation = async (updatedPosition: any) => {
        //broadcast user position to realtime
        await channel
          .send({
            type: "broadcast",
            event: "location",
            payload: {
              userID: user?.id,
              role: profile?.role,
              name: profile?.full_name,
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
          //set new user position
          setMyPosition(newPosition);
          setMapCenter(newPosition);
          //broadcast location
          sendLocation(newPosition)
        },
        async (error) => {
          console.error("Error watching location: ", error);
          if (error.code === error.POSITION_UNAVAILABLE) {
            // Fallback: approximate by IP
            const res = await fetch('https://ipapi.co/json/');
            const data = await res.json();
            const newPosition = {
              lat: data.latitude,
              lng: data.longitude,
            };
            console.log('Broadcasting location using IP')
            setMyPosition(newPosition)
            setMapCenter(newPosition)
            sendLocation(newPosition)
          }
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
      );
    };

    init();

    const updateUserLocation = (updateLocation: UserLocation) => {
      setUsers(prevUsers => {
        const index = prevUsers.findIndex(u => u.userID === updateLocation.userID);
        if (index !== -1 && updateLocation.userID !== userID) {
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

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    console.log("Updated users: ", users);
    console.log('activeWalks', activeWalks)

  }, [users, activeWalks]);


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

  useEffect(() => {
    const getClicked = async () => {
      const { data, error } = await supabase
        .from("walk_review")
        .select("rating")
        .eq("user_id", clickedUser?.userID);
      if (error) {
        console.error(error);
        return;
      }
      if (data && data.length > 0) {
        const avg = data.reduce((sum, row) => sum + row.rating, 0) / data.length;
        console.log("Average rating:", avg);
        setClickedRating({ rating: avg, count: data.length })
      } else {
        console.log("No ratings found");
      }
    };
    getClicked();
  }, [clickedUser]);


  // restores state after back click from walkerProfile
  useEffect(() => {
    if (location.state?.selectedUser) {
      setClickedUser(location.state.selectedUser);
      setMapCenter(location.state.selectedUser.position);
    } else {
      setMapCenter(center);
    }
  }, [location.state]);

  const allUsers = [...users];

  if (!mapCenter) {
    return (
      <ProtectedRoute>
        <OwnerMenu />
        <div>Loading map...</div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <OwnerMenu />

      <APIProvider apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}>
        <Map
          mapId={import.meta.env.VITE_GOOGLE_MAP_ID}
          style={{ width: '100vw', height: '100vh' }}
          defaultCenter={mapCenter ? mapCenter : { lat: 49.24, lng: -123.05 }}
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
                  if (user.role == 'walker') {
                    setClickedUser(user);
                    setMapCenter(user.position);
                  }
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
                  <span>{clickedRating?.rating.toFixed(2)} ({clickedRating?.count})</span>
                </div>
              </div>
              <button className="request-button" onClick={() => setClickedUser(null)}>
                Details
              </button>
              {/* <div className="details">
                <span className="price">${'30'} per walk</span>
                <span className="capacity">Capacity {'2/3'} Dogs</span>
              </div> */}
            </div>
          </div>
        )}

        {activeWalks && activeWalks.length > 0 && (
          <div className="absolute right-0 top-0 flex flex-col items-end gap-3 pt-4 px-4">
            <div className="bg-wsage/75 backdrop-blur-sm rounded-2xl shadow-lg px-4 py-3 w-full max-w-xs flex flex-col gap-3">
              <p className="text-center text-white/90 text-xl mb-1">Active Walks</p>

              {activeWalks.map((walk) => (
                <Button
                  key={walk.session}
                  className="rounded-3xl py-2 text-sm sm:text-base w-full flex items-center justify-center"
                  onClick={() => navigate(`/track/${walk.session}`)}
                >
                  {walk.dog}
                </Button>
              ))}
            </div>
          </div>
        )}


        <div className="absolute bottom-4 w-full flex justify-center items-center px-4">
          <div className="bg-wsage/75 backdrop-blur-sm rounded-2xl shadow-lg px-4 py-3 gap-3 w-full max-w-md">
            <p className='text-center w-full mb-2 text-3xl text-white/90'>Find walk?</p>
            <div className='flex justify-center items-center px-4 gap-4'>
              <Button className="flex-1 rounded-3xl py-2 text-sm sm:text-base flex items-center justify-center gap-2" onClick={() => navigate("/owner/schedule")}>
                Now
              </Button>
              <Button className="flex-1 rounded-3xl py-2 text-sm sm:text-base flex items-center justify-center gap-2" onClick={() => navigate("/owner/schedule/latertemp")}>
                Later
              </Button>
            </div>
          </div>
        </div>
      </APIProvider>
    </ProtectedRoute>
  );
}