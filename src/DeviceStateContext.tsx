import { createContext, useContext, useState } from "react";

type DeviceContextType = {
  state: string;
  setState: (value: string) => void;
};

const DeviceStateContext = createContext<DeviceContextType>({
  state: "WAITING_FOR_WALKER",
  setState: () => {},
});

export default function DeviceStateProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState("WAITING_FOR_WALKER");

  return (
    <DeviceStateContext.Provider value={{ state, setState }}>
      {children}
    </DeviceStateContext.Provider>
  );
}

export const useDeviceState = () => useContext(DeviceStateContext);