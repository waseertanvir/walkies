import { useLocation, useNavigate } from 'react-router';
import '../App.css'
import { ArrowLeft, X } from "lucide-react";
import { useState, useRef, useEffect} from 'react';
import { APIProvider, Map, AdvancedMarker, useMapsLibrary } from '@vis.gl/react-google-maps';
import { useDeviceState } from "../../DeviceStateContext";

export default function ScheduleWalk() {
    return (
        <APIProvider apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}>
            <ScheduleWalkContent />
        </APIProvider>
    );
}

function ScheduleWalkContent() {
    const location = useLocation();
    const navigate = useNavigate();
    const [selectDog, setSelectDog] = useState("");
    const [selectActivity, setSelectActivity] = useState("");
    const [durationHours, setDurationHours] = useState("");
    const [pickupAddress, setPickupAddress] = useState("");
    const [dropoffAddress, setDropoffAddress] = useState("");
    const [pickupLocation, setPickupLocation] = useState<{ lat : number ; lng : number} | null>(null);
    const [dropoffLocation, setDropoffLocation] = useState<{ lat : number ; lng : number} | null>(null);
    const [myPosition, setMyPosition] = useState<{ lat: number; lng: number } | null>(null);
    const center = myPosition ?? { lat: 49.24, lng: -123.05 };
    const [mapCenter, setMapCenter] = useState(center);
    const { setState } = useDeviceState();

    const places = useMapsLibrary('places');
    const pickupInputRef = useRef(null);
    const dropoffInputRef = useRef(null);

    useEffect(() => {
        console.log('useEffect running!');
        if (!places || !pickupInputRef.current || !dropoffInputRef.current) return;

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
    }, [places]);

    return (
        <APIProvider apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}>
        <div>
            <button
                className="bg-wolive text-black p-2 m-5 w-11.5 rounded-full"
                onClick={() => navigate(-1)}>
                <ArrowLeft size={30} />
            </button>

            <div className='flex items-center m-5'>
                <select
                    id="options"
                    className='p-1 rounded-md bg-white border border-gray-300 w-full'
                    value={selectDog}
                    onChange={(e) => setSelectDog(e.target.value)}  >
                    <option value="">Select your dog</option>
                    <option value="apple">Rottweiler</option>
                    <option value="banana">German Shepherd</option>
                    <option value="cherry">Pitbull</option>
                </select>
            </div>

            <div className='flex items-center m-5'>
                <select
                    id="options"
                    className='p-1 rounded-md bg-white border border-gray-300 w-full'
                    value={selectActivity}
                    onChange={(e) => setSelectActivity(e.target.value)}>
                    <option value="">Select the activity</option>
                    <option value="apple">Pet Sitting</option>
                    <option value="banana">Walking</option>
                    <option value="cherry">Running</option>
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

            <div className='flex items-center m-5 p-[5px] rounded-md bg-white border border-[#ccc]'>
                <input
                    type="text"
                    id="date"
                    placeholder="Date"
                    value={new Date().toString()}
                    readOnly 
                />
            </div>
            
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
                                        className='w-[20px] h-[20px] rounded-full bg-[#FE7F2D] border-3 border-white'
                                    />
                                </AdvancedMarker>
                            )}
                        </Map>
                    </div>
                </div>

                
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
                                        className='w-[20px] h-[20px] rounded-full bg-[#FE7F2D] border-3 border-white'
                                    />
                                </AdvancedMarker>
                            )}
                        </Map>
                    </div>
                </div>
            <div className="flex justify-center w-full">
                <button className="p-4 rounded-3xl bg-worange"
                    onClick={() => {
                        setState("BROADCAST");
                        navigate(-1);
                    }}>
                    Schedule
                </button>
            </div>
        </div>
        </APIProvider>
    );
}