import { useEffect, useRef } from "react";
import { useMap } from "@vis.gl/react-google-maps";

type LatLng = { lat: number; lng: number };

interface TrajectoryLineProps {
  path: LatLng[];
  options?: google.maps.PolylineOptions;
}

export function TrajectoryLine({ path, options }: TrajectoryLineProps) {
  const map = useMap();
  const trajectoryLineRef = useRef<google.maps.Polyline | null>(null);

  useEffect(() => {
    if (!map || typeof window === "undefined" || !window.google?.maps) return;

    if (!trajectoryLineRef.current) {
      trajectoryLineRef.current = new window.google.maps.Polyline({
        map,
        path,
        ...(options || {}),
      });
    } else {
      trajectoryLineRef.current.setPath(path);
      trajectoryLineRef.current.setOptions(options || {});
    }

    return () => {
      trajectoryLineRef.current?.setMap(null);
      trajectoryLineRef.current = null;
    };
  }, [map, path, options]);

  return null;
}
