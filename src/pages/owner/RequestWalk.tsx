import { useLocation, useNavigate } from 'react-router';
import '../App.css'
import { ArrowLeft, X } from "lucide-react";
import { useState } from 'react';
import { APIProvider, Map, Marker, AdvancedMarker } from '@vis.gl/react-google-maps';

export default function RequestWalk() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = location.state?.user;
  const [selectDog, setSelectDog] = useState("");
  const [selectActivity, setSelectActivity] = useState("");
  const [durationHours, setDurationHours] = useState("");
  const [myPosition, setMyPosition] = useState<{ lat: number; lng: number } | null>(null);
  const center = myPosition ?? { lat: 49.24, lng: -123.05 };
  const [mapCenter, setMapCenter] = useState(center);

  if (!user) {
    return <div>User not found</div>;
  }


  return (
    <body className='flex min-h-screen items-center justify-center bg-gray-50'>
      <div className='request-walk grid items-center justify-center w-full'>
        <button
          className="bg-wolive text-black p-2 m-5 w-11.5 rounded-full"
          onClick={() => console.log("Yeah Buddy! Lightweight!")}>
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
            value={durationHours}
            onChange={(e) => setDurationHours(e.target.value)}
          />
        </div>
        <div
          className="grid m-5 gap-2 p-2 rounded-md bg-white border border-gray-300">
          <label className="font-medium">Drop off location:</label>
          <div className="flex items-center justify-between">
            <label htmlFor="durationCheckBox" className="mr-2">
              Current Location:
            </label>

            <input
              type="checkbox"
              id="durationCheckBox"
              name="durationCheckBox"
              checked={durationHours}
              onChange={(e) => setDurationHours(e.target.checked)}
              className="h-4 w-4 text-worange focus:ring-worange border-gray-300 rounded"
            />
          </div>
        </div>

        <div className='flex items-center m-5 p-[5px] rounded-md bg-white border border-[#ccc]'>
          <input
            type="text"
            id="address"
            min="0"
            step="0.5"
            placeholder="Address"
            value={durationHours}
            onChange={(e) => setDurationHours(e.target.value)}
          />
        </div>

        <div className="m-5 p-1 rounded-md bg-white border border-gray-300 h-40">
          <APIProvider apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}>
            <Map
              mapId={import.meta.env.VITE_GOOGLE_MAP_ID}
              defaultCenter={mapCenter}
              defaultZoom={15}
              disableDefaultUI={true}
              clickableIcons={false} >
              {myPosition && (
                <AdvancedMarker
                  position={myPosition}
                  onClick={() => console.log('clicked my position: ', myPosition)}
                >
                  <div
                    className='w-[20px] h-[20px] rounded-full bg-[#FE7F2D] border-3 border-white'
                  />
                </AdvancedMarker>
              )}
            </Map>
          </APIProvider>

        </div>

        <div className="flex justify-center w-full">
          <button className="p-4 rounded-3xl bg-worange" onClick={() => { }}>
            Request Walk
          </button>
        </div>

      </div>
    </body>
  );
}