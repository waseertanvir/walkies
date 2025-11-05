import { createContext, useContext, useState } from "react";

type DeviceContextType = {
  state: string;
  setState: (value: string) => void;
};

const DeviceStateContext = createContext<DeviceContextType>({
  state: "WALK_IN_PROGRESS",
  setState: () => {},
});

export default function DeviceStateProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState("WALK_IN_PROGRESS");

  return (
    <DeviceStateContext.Provider value={{ state, setState }}>
      {children}
    </DeviceStateContext.Provider>
  );
}

export const useDeviceState = () => useContext(DeviceStateContext);