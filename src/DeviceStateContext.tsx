import { createContext, useContext, useState } from "react";

type DeviceContextType = {
  state: string;
  setState: (value: string) => void,
  sessionId: string,
  setSessionId: (value: string) => void
};

const DeviceStateContext = createContext<DeviceContextType>({
  state: "WALK_IN_PROGRESS",
  setState: () => {},
  sessionId: "",
  setSessionId: () => {},
});

export default function DeviceStateProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState("WALK_IN_PROGRESS");
  const [sessionId, setSessionId] = useState("a15e751c-e733-4306-a9c5-42a328f6dd72");

  return (
    <DeviceStateContext.Provider value={{ state, setState, sessionId, setSessionId }}>
      {children}
    </DeviceStateContext.Provider>
  );
}

export const useDeviceState = () => useContext(DeviceStateContext);