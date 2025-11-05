import { createContext, useContext, useState } from "react";

type DeviceContextType = {
  state: string;
  setState: (value: string) => void;
};

const DeviceStateContext = createContext<DeviceContextType>({
  state: "WALKER_HAS_ACCEPTED",
  setState: () => {},
});

export default function DeviceStateProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState("WALKER_HAS_ACCEPTED");

  return (
    <DeviceStateContext.Provider value={{ state, setState }}>
      {children}
    </DeviceStateContext.Provider>
  );
}

export const useDeviceState = () => useContext(DeviceStateContext);