import { useLocation, useNavigate, useParams } from 'react-router';
import '../App.css'
import { ArrowLeft, X } from "lucide-react";
import { useState, useRef, useEffect } from 'react';
import { APIProvider, Map, AdvancedMarker, useMapsLibrary } from '@vis.gl/react-google-maps';
import { useDeviceState } from "../../DeviceStateContext";
import { supabase } from '../../supabaseClient';
import { ChevronLeft } from 'lucide-react';

export default function ScheduleWalk() {
    return (
        <APIProvider apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}>
            <ScheduleWalkContent />
        </APIProvider>
    );
}

function ScheduleWalkContent() {
    const { walkerID } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const [requestType, setRequestType] = useState("");

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

    const { setState } = useDeviceState();
    const [submitting, setSubmitting] = useState(false);

    const places = useMapsLibrary('places');
    const pickupInputRef = useRef(null);
    const dropoffInputRef = useRef(null);

    useEffect(() => {
        console.log('useEffect running!');
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


    // const handleBroadcast = async () => {
    //     try {
    //         setSubmitting(true);
    //         setState("BROADCAST");
    //         const response = await sendRequest();
    //         if (response) navigate(-1);
    //     } finally {
    //         setSubmitting(false);
    //     }
    // };
    const handleImmediateWalk = async () => {
        if (!selectedDogId) {
            alert("Please select a dog first.");
            return;
        }

        try {
            setSubmitting(true);
            // setState("BROADCAST");

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

            // Navigate to the live tracking page for the new session
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
        <APIProvider apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}>
            <div>
                {/* <button
                    className="fixed top-4 left-4 z-50 bg-wolive text-black p-2 rounded-full shadow-lg hover:bg-green-600 transition"
                    onClick={() => navigate(-1)}>
                    <ArrowLeft size={30} />
                </button>
                <div className="flex justify-center mb-12">
                    <h1 className="text-2xl font-bold text-white text-center mt-2">Schedule Walk</h1>
                </div> */}

                <div className="relative mb-12">
                    <button
                        onClick={() => navigate(-1)}
                        className="fixed top-4 left-4 z-50 bg-wolive text-black p-2 rounded-full shadow-lg hover:bg-green-600 transition"
            >
                        <ChevronLeft size={30} />
                    </button>
            {/* <h1 className="text-2xl font-bold text-white ">My Sessions</h1> */}
                    <div className="flex justify-center">
                        <h1 className="text-2xl font-bold text-white text-center mt-2">Set Up Your Walk</h1>
                    </div>
            </div>

                <div className='flex items-center m-5'>
                    <select
                        id="dogs"
                        className='p-1 rounded-md bg-white border border-gray-300 w-full'
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
                </div>

                <div className='flex items-center m-5'>
                    <select
                        id="activities"
                        className='p-1 rounded-md bg-white border border-gray-300 w-full'
                        value={selectActivity}
                        onChange={(e) => setSelectActivity(e.target.value)}>
                        <option value="">Select the activity</option>
                        <option value="walking">Walking</option>
                        <option value="running">Running</option>
                        <option value="fetch">Fetch</option>
                        <option value="hiking">Hiking</option>
                    </select>
                </div>

                <div
                    className="flex justify-between items-center m-5 p-1 rounded-md bg-white border border-gray-300">
                    <label htmlFor="duration">Enter duration:</label>
                    <input
                        type="number"
                        id="duration"
                        name="duration"
                        min="0"
                        step="0.5"
                        placeholder="e.g. 2.5"
                        defaultValue={durationHours}
                        onChange={(e) => setDurationHours(e.target.value)}
                    />
                </div>

                <div className="flex justify-between items-center m-5 p-1 rounded-md bg-white border border-gray-300">
                    <label htmlFor="compensation">Compensation ($/hr):</label>
                    <input
                        type="number"
                        id="compensation"
                        name="compensation"
                        min="0"
                        step="1"
                        placeholder="Enter amount"
                        value={compensation}
                        onChange={(e) => setCompensation(e.target.value)}
                        className="w-24 text-right"
                    />
                </div>
                {requestType === "select" && (
                    <div className="flex items-center m-5 p-[5px] rounded-md bg-white border border-[#ccc]">
                        <input
                            type="datetime-local"
                            id="date"
                            value={dateTime}
                            onChange={(e) => setDateTime(e.target.value)}
                            className="p-2 w-full rounded-md border border-gray-300"
                        />
                    </div>
                )}

                {requestType == "select" && (
                    <div className="m-5 p-1 grid rounded-md bg-white border border-gray-300 h-auto">
                        <label className="m-2">
                            Pickup Location:
                        </label>

                        <input
                            ref={pickupInputRef}
                            type="text"
                            placeholder="Address"
                            value={pickupAddress}
                            className='m-2 border border-gray-300 rounded-md p-2'
                            onChange={(e) => setPickupAddress(e.target.value)}
                        />

                        <div className='m-2 h-50'>
                            <Map
                                mapId={import.meta.env.VITE_GOOGLE_MAP_ID}
                                center={pickupLocation || mapCenter}
                                defaultZoom={15}
                                disableDefaultUI={true}
                                clickableIcons={false} >
                                {pickupLocation && (
                                    <AdvancedMarker
                                        position={pickupLocation}
                                        onClick={() => console.log('clicked my position: ', pickupLocation)}
                                    >
                                        <div
                                            className='w-5 h-5 rounded-full bg-worange border-3 border-white'
                                        />
                                    </AdvancedMarker>
                                )}
                            </Map>
                        </div>
                    </div>
                )}


                <div className="m-5 p-1 grid rounded-md bg-white border border-gray-300 h-auto">
                    <label className="m-2">
                        Dropoff Location:
                    </label>

                    <input
                        ref={dropoffInputRef}
                        type="text"
                        placeholder="Address"
                        value={dropoffAddress}
                        className='m-2 border border-gray-300 rounded-md p-2'
                        onChange={(e) => setDropoffAddress(e.target.value)}
                    />

                    <div className='m-2 h-50'>
                        <Map
                            mapId={import.meta.env.VITE_GOOGLE_MAP_ID}
                            center={dropoffLocation || mapCenter}
                            defaultZoom={15}
                            disableDefaultUI={true}
                            clickableIcons={false} >
                            {dropoffLocation && (
                                <AdvancedMarker
                                    position={dropoffLocation}
                                    onClick={() => console.log('clicked my position: ', dropoffLocation)}
                                >
                                    <div
                                        className='w-5 h-5 rounded-full bg-worange border-3 border-white'
                                    />
                                </AdvancedMarker>
                            )}
                        </Map>
                    </div>
                </div>

                <div className="flex flex-col m-5 p-[5px] rounded-md bg-white border border-[#ccc]">
                    <label htmlFor="instructions" className="mb-1 text-gray-700">
                        Special Instructions:
                    </label>
                    <textarea
                        id="instructions"
                        placeholder="Add any notes or special instructions for the walk"
                        value={instructions}
                        onChange={(e) => setInstructions(e.target.value)}
                        className="p-2 border border-gray-300 rounded-md resize-none h-24"
                    />
                </div>

                <div className="flex justify-center w-full">
                    {requestType === 'broadcast' && (
                        <button
                            className="p-4 rounded-3xl bg-worange disabled:opacity-50"
                            onClick={handleImmediateWalk}
                            disabled={submitting}
                        >
                            {submitting ? 'Finding walkers...' : 'Broadcast Now'}
                        </button>
                    )}
                    {requestType === 'select' && (
                        <button
                            className="p-4 rounded-3xl bg-worange disabled:opacity-50"
                            onClick={handleSelect}
                            disabled={submitting}
                        >
                            {submitting ? 'Requesting...' : 'Request'}
                        </button>
                    )}
                </div>
            </div>
        </APIProvider>
    );
}