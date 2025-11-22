import { useLocation, useNavigate, useParams } from 'react-router';
import '../App.css'
import { useState, useRef, useEffect } from 'react';
import { APIProvider, Map, AdvancedMarker, useMapsLibrary } from '@vis.gl/react-google-maps';
import { supabase } from '../../supabaseClient';
import { ChevronLeft } from 'lucide-react';
import { Card, Button } from '../../components/ui';

export default function ScheduleWalk() {
  return (
    <APIProvider apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}>
      <ScheduleWalkContent />
    </APIProvider>
  );
}

function ScheduleWalkContent() {
  const { walkerID, sessionID } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [requestType, setRequestType] = useState("");
  const isEditMode = !!sessionID;

  const [dogs, setDogs] = useState<any[]>([]);
  const [selectedDogId, setSelectedDogId] = useState<string>("");

  const [selectActivity, setSelectActivity] = useState("");
  const [durationHours, setDurationHours] = useState("");
  const [dateTime, setDateTime] = useState("");
  const [compensation, setCompensation] = useState("15");
  const [instructions, setInstructions] = useState("");

  const [pickupAddress, setPickupAddress] = useState("");
  const [dropoffAddress, setDropoffAddress] = useState("");
  const [pickupLocation, setPickupLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [dropoffLocation, setDropoffLocation] = useState<{ lat: number; lng: number } | null>(null);

  const [myPosition, setMyPosition] = useState<{ lat: number; lng: number } | null>(null);
  const center = myPosition ?? { lat: 49.24, lng: -123.05 };
  const [mapCenter, setMapCenter] = useState(center);

  const [submitting, setSubmitting] = useState(false);

  const places = useMapsLibrary('places');
  const pickupInputRef = useRef<HTMLInputElement | null>(null);
  const dropoffInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!places) return;

    if (pickupInputRef.current) {
      const pickupAutocomplete = new places.Autocomplete(pickupInputRef.current, {
        fields: ['geometry', 'formatted_address']
      });

      pickupAutocomplete.addListener('place_changed', () => {
        const place = pickupAutocomplete.getPlace();
        if (place.geometry?.location) {
          setPickupLocation({
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng()
          });
          setPickupAddress(place.formatted_address || place.name || "");
        }
      });
    }

    if (dropoffInputRef.current) {
      const dropoffAutocomplete = new places.Autocomplete(dropoffInputRef.current, {
        fields: ['geometry', 'formatted_address']
      });

      dropoffAutocomplete.addListener('place_changed', () => {
        const place = dropoffAutocomplete.getPlace();
        if (place.geometry?.location) {
          setDropoffLocation({
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng()
          });
          setDropoffAddress(place.formatted_address || place.name || "");
        }
      });
    }
  }, [places]);

  useEffect(() => {
    // get list of dogs
    const getDogs = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('pets')
        .select('*')
        .eq('owner_id', user?.id)

      if (error) {
        console.error('Error fetching dogs:', error);
        return;
      } else {
        setDogs(data ?? []);
        if ((data?.length ?? 0) === 1) setSelectedDogId(data![0].id);
      }
    }
    getDogs()

    // get request type
    const getType = async () => {
      if (walkerID === 'latertemp') {
        setRequestType("select");
        setDateTime("");
      } else if (!walkerID) {
        setDateTime(new Date().toISOString().slice(0, 16));
        setPickupLocation(myPosition);
        setRequestType("broadcast");
      }
      else {
        setRequestType("select");
        setDateTime(new Date().toISOString().slice(0, 16));
      }
    };
    getType();
  }, [])

  useEffect(() => {
    if (!isEditMode || !sessionID) return;

    const loadSession = async () => {
      const { data, error } = await supabase
        .from("sessions")
        .select("*")
        .eq("id", sessionID)
        .single();

      if (error) {
        console.error("Error loading session:", error);
        return;
      }

      setSelectedDogId(data.pet_id);
      setSelectActivity(data.activity || "");
      setDurationHours((data.duration_minutes / 60).toString());
      setDateTime(data.start_time.slice(0, 16)); // datetime-local format
      setCompensation(data.compensation.toString());
      setInstructions(data.special_instructions || "");

      if (data.meeting_location) {
        setPickupAddress(data.meeting_location.address || "");
        setPickupLocation(data.meeting_location);
      }

      if (data.dropoff_location) {
        setDropoffAddress(data.dropoff_location.address || "");
        setDropoffLocation(data.dropoff_location);
      }
    };

    loadSession();
  }, [isEditMode, sessionID]);

  const handleUpdateSession = async () => {
    if (!sessionID) return;

    const startIso = new Date(dateTime).toISOString();

    const { error } = await supabase
      .from("sessions")
      .update({
        pet_id: selectedDogId,
        activity: selectActivity,
        duration_minutes: Math.round(parseFloat(durationHours) * 60),
        start_time: startIso,
        compensation: Number(compensation),
        meeting_location: pickupLocation,
        dropoff_location: dropoffLocation,
        special_instructions: instructions
      })
      .eq("id", sessionID);

    if (error) {
      console.error("Update error:", error);
      alert("Could not update walk.");
      return;
    }

    alert("Walk updated!");
    navigate("/my-sessions");
  };

  const sendRequest = async (type: string): Promise<boolean> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const startIso =
      dateTime
        ? new Date(dateTime).toISOString()
        : new Date().toISOString();

    if (!compensation || Number(compensation) <= 0) {
      alert("Please enter a valid compensation amount.");
      return false;
    }

    const { error } = await supabase.from('sessions').insert({
      owner_id: user.id,
      walker_id: walkerID === "latertemp" ? null : walkerID,
      pet_id: selectedDogId || null,
      status: 'pending',
      start_time: startIso,
      duration_minutes: durationHours ? Math.round(parseFloat(durationHours) * 60) : null,
      compensation: Number(compensation),
      activity: selectActivity || null,
      meeting_location: pickupLocation,
      dropoff_location: dropoffLocation,
      special_instructions: instructions || null,
      type: type
    });

    if (error) {
      console.error('Error creating request:', error);
      alert('Error creating request: ' + error.message);
      return false;
    }
    return true;
  };

  const handleImmediateWalk = async () => {
    if (!selectedDogId) {
      alert("Please select a dog first.");
      return;
    }

    try {
      setSubmitting(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const nowIso = new Date().toISOString();
      const type = walkerID ? "schedule" : "broadcast";

      const { data, error } = await supabase
        .from('sessions')
        .insert({
          owner_id: user.id,
          walker_id: null, // broadcast
          pet_id: selectedDogId,
          status: 'pending',
          start_time: nowIso,
          duration_minutes: durationHours ? Math.round(parseFloat(durationHours) * 60) : 30,
          compensation: Number(compensation),
          activity: selectActivity || null,
          meeting_location: pickupLocation,
          dropoff_location: dropoffLocation,
          special_instructions: instructions || null,
          type: type
        })
        .select('id');

      const insertedId = data?.[0]?.id;

      if (!insertedId) {
        alert("Could not retrieve the new session ID.");
        return;
      }

      if (error) {
        console.error("Error creating session:", error);
        alert("Error creating session: " + error.message);
        return;
      }

      navigate(`/track/${insertedId}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSelect = async () => {
    try {
      setSubmitting(true);
      const response = await sendRequest("schedule");
      if (response) navigate('/owner/dashboard/');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-wblue p-4">
      <div className="top-4 left-4 z-50">
        <button
          onClick={() => navigate(-1)}
          className="fixed top-4 left-4 z-50 bg-wsage/75 backdrop-blur-sm text-black p-2 rounded-full shadow-lg"
        >
          <ChevronLeft size={30} />
        </button>
      </div>

      <div className="max-w-3xl mx-auto mt-8">
        <h1 className="text-3xl font-bold text-white mb-8 text-center">
          Set Up Your Walk
        </h1>

        {/* Dog selection */}
        <div className="grid mb-6">
          <Card>
            <h2 className="font-semibold text-xs text-gray-600 mb-2">Dog</h2>
            <select
              id="dogs"
              className="w-full px-3 py-2 bg-white/20 rounded-md focus:outline-none focus:bg-white/60"
              value={selectedDogId}
              onChange={(e) => setSelectedDogId(e.target.value)}
            >
              <option value="">Select your dog</option>
              {dogs.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}{d.breed ? ` • ${d.breed}` : ""}
                </option>
              ))}
            </select>
          </Card>
        </div>

        {/* Activity / Duration / Compensation */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <Card>
            <h2 className="font-semibold text-xs text-gray-600 mb-2">Activity</h2>
            <select
              id="activities"
              className="w-full px-3 py-2 bg-white/20 rounded-md focus:outline-none focus:bg-white/60"
              value={selectActivity}
              onChange={(e) => setSelectActivity(e.target.value)}
            >
              <option value="">Select the activity</option>
              <option value="walking">Walking</option>
              <option value="running">Running</option>
              <option value="fetch">Fetch</option>
              <option value="hiking">Hiking</option>
            </select>
          </Card>

          <Card>
            <h2 className="font-semibold text-xs text-gray-600 mb-2">Duration (hours)</h2>
            <input
              type="number"
              id="duration"
              name="duration"
              min="0"
              step="0.5"
              placeholder="e.g. 2.5"
              value={durationHours}
              onChange={(e) => setDurationHours(e.target.value)}
              className="w-full px-3 py-2 bg-white/20 rounded-md focus:outline-none focus:bg-white/60"
            />
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <Card>
            <h2 className="font-semibold text-xs text-gray-600 mb-2">Compensation ($/hr)</h2>
            <input
              type="number"
              id="compensation"
              name="compensation"
              min="0"
              step="1"
              placeholder="Enter amount"
              value={compensation}
              onChange={(e) => setCompensation(e.target.value)}
              className="w-full px-3 py-2 bg-white/20 rounded-md focus:outline-none focus:bg-white/60"
            />
          </Card>

          {requestType === "select" && (
            <Card>
              <h2 className="font-semibold text-xs text-gray-600 mb-2">Date & Time</h2>
              <input
                type="datetime-local"
                id="date"
                value={dateTime}
                onChange={(e) => setDateTime(e.target.value)}
                className="w-full px-3 py-2 bg-white/20 rounded-md focus:outline-none focus:bg-white/60"
              />
            </Card>
          )}
        </div>

        {/* Pickup location */}
        {requestType === "select" && (
          <div className="grid mb-6">
            <Card>
              <h2 className="font-semibold text-xs text-gray-600 mb-2">Pickup Location</h2>
              <input
                ref={pickupInputRef}
                type="text"
                placeholder="Address"
                value={pickupAddress}
                className="w-full px-3 py-2 mb-3 bg-white/20 rounded-md focus:outline-none focus:bg-white/60"
                onChange={(e) => setPickupAddress(e.target.value)}
              />
              <div className="h-64 rounded-md overflow-hidden">
                <Map
                  mapId={import.meta.env.VITE_GOOGLE_MAP_ID}
                  center={pickupLocation || mapCenter}
                  defaultZoom={15}
                  disableDefaultUI={true}
                  clickableIcons={false}
                >
                  {pickupLocation && (
                    <AdvancedMarker
                      position={pickupLocation}
                      onClick={() => console.log('clicked pickup position: ', pickupLocation)}
                    >
                      <div className="w-5 h-5 rounded-full bg-worange border-3 border-white" />
                    </AdvancedMarker>
                  )}
                </Map>
              </div>
            </Card>
          </div>
        )}

        {/* Dropoff location */}
        <div className="grid mb-6">
          <Card>
            <h2 className="font-semibold text-xs text-gray-600 mb-2">Dropoff Location</h2>
            <input
              ref={dropoffInputRef}
              type="text"
              placeholder="Address"
              value={dropoffAddress}
              className="w-full px-3 py-2 mb-3 bg-white/20 rounded-md focus:outline-none focus:bg-white/60"
              onChange={(e) => setDropoffAddress(e.target.value)}
            />
            <div className="h-64 rounded-md overflow-hidden">
              <Map
                mapId={import.meta.env.VITE_GOOGLE_MAP_ID}
                center={dropoffLocation || mapCenter}
                defaultZoom={15}
                disableDefaultUI={true}
                clickableIcons={false}
              >
                {dropoffLocation && (
                  <AdvancedMarker
                    position={dropoffLocation}
                    onClick={() => console.log('clicked dropoff position: ', dropoffLocation)}
                  >
                    <div className="w-5 h-5 rounded-full bg-worange border-3 border-white" />
                  </AdvancedMarker>
                )}
              </Map>
            </div>
          </Card>
        </div>

        {/* Instructions */}
        <div className="grid mb-8">
          <Card>
            <h2 className="font-semibold text-xs text-gray-600 mb-2">Special Instructions</h2>
            <textarea
              id="instructions"
              placeholder="Add any notes or special instructions for the walk"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              className="w-full px-3 py-2 bg-white/20 rounded-md focus:outline-none focus:bg-white/60 resize-none h-24"
            />
          </Card>
        </div>

        {/* Actions */}
        <div className="flex justify-center gap-4">
          {!isEditMode && requestType === 'broadcast' && (
            <Button
              className="mb-6 w-[35%]"
              onClick={handleImmediateWalk}
              disabled={submitting}
            >
              {submitting ? 'Finding walkers...' : 'Broadcast Now'}
            </Button>
          )}
          {!isEditMode && requestType === 'select' && (
            <Button
              className="mb-6 w-[35%]"
              onClick={handleSelect}
              disabled={submitting}
            >
              {submitting ? 'Requesting...' : 'Request Walk'}
            </Button>
          )}
          {isEditMode && (
            <Button
              className="mb-6 w-[35%]"
              onClick={handleUpdateSession}
              disabled={submitting}
            >
              {submitting ? 'Saving...' : 'Update Walk'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
