import { useState } from 'react'
import './App.css'
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';

export default function App() {
  const [selectedMarker, setSelectedMarker] = useState<number | null>(null);
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

  const mapContainerStyle = {
    height: "100vh",
    width: "100vw"
  };

  const center = { lat: 49.24, lng: -123.05 }
if (!isLoaded) return <div>Loading map...</div>;

  return (
    <>
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={center}
          zoom={13}
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
        </GoogleMap>
    </>
  )
}