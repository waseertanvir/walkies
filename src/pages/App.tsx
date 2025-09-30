import { useEffect, useState } from 'react'
import './App.css'
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';
import dogIcon from '../assets/Logo.png'

export default function App() {
  const [selectedMarker, setSelectedMarker] = useState<number | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [myPosition, setMyPosition] = useState<{ lat: number; lng: number } | null>(null);


  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY
  });

  type MarkerType = {
    geocode: { lat: number; lng: number };
    popUp: string;
  }

  const markers: MarkerType[] = [
    {
      geocode: { lat: 49.24, lng: -123.05 },
      popUp: "marker1"
    },
    {
      geocode: { lat: 49.23, lng: -123.05 },
      popUp: "marker2"
    }
  ]

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

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const newPosition = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        setMyPosition(newPosition);
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
  
if (!isLoaded) return <div>Loading map...</div>;

  return (
    <>
      <button onClick={() => setIsTracking(!isTracking)}
        className={`tracking-btn ${isTracking ? 'active' : 'inactive'}`}
      >
        {isTracking ? 'Stop Tracking' : 'Start Tracking'}
      </button>

      {isTracking && myPosition && (
        <div className="status-box">
          timer and other info here
        </div>
      )}

        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={center}
          zoom={isTracking ? 15 : 13}
        >
          {markers.map((marker, index) => (
            <Marker
              key={index}
              position={marker.geocode}
              onClick={() => setSelectedMarker(index)}
            >
              {selectedMarker === index && (
                <InfoWindow onCloseClick={() => setSelectedMarker(null)}>
                  <div>{marker.popUp}</div>
                </InfoWindow>
              )}
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
  )
}