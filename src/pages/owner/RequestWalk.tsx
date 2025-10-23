import { useLocation, useNavigate } from 'react-router';
import '../App.css'
import { ArrowLeft, X } from "lucide-react";
import { useState } from 'react';

export default function RequestWalk() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = location.state?.user;
  const [selectDog, setSelectDog] = useState("");
  const [selectActivity, setSelectActivity] = useState("");
  const [durationHours, setDurationHours] = useState("");
  const [myPosition, setMyPosition] = useState<{ lat: number; lng: number } | null>(null);

  if (!user) {
    return <div>User not found</div>;
  }

  return (
    <div
      className="request-walk justify-center">
      <button
        onClick={() => console.log("Yeah Buddy! Lightweight!")}
        className="bg-wolive text-black p-2 m-5 rounded-full">
        <ArrowLeft size={30} />
      </button>

      <div style={{ alignItems: "center", margin: "20px" }}>
        <select
          id="options"
          value={selectDog}
          onChange={(e) => setSelectDog(e.target.value)}
          style={{
            padding: "5px",
            borderRadius: "6px",
            backgroundColor: "white",
            border: "1px solid #ccc",
            width: "100%"
          }}
        >
          <option value="">Select your dog</option>
          <option value="apple">Rottweiler</option>
          <option value="banana">German Shepherd</option>
          <option value="cherry">Pitbull</option>
        </select>
      </div>

      <div style={{ alignItems: "center", margin: "20px" }}>
        <select
          id="options"
          value={selectActivity}
          onChange={(e) => setSelectActivity(e.target.value)}
          style={{
            padding: "5px",
            borderRadius: "6px",
            backgroundColor: "white",
            border: "1px solid #ccc",
            width: "100%"
          }}
        >
          <option value="">Select the activity</option>
          <option value="apple">Pet Sitting</option>
          <option value="banana">Walking</option>
          <option value="cherry">Running</option>
        </select>
      </div>

      <div
        className="flex justify-between"
        style={{
          alignItems: "center",
          margin: "20px",
          padding: "5px",
          borderRadius: "6px",
          backgroundColor: "white",
          border: "1px solid #ccc",
        }}>
        <label htmlFor="duration" style={{ width: "45%" }}>Enter duration:</label>
        <input
          type="number"
          id="duration"
          name="duration"
          min="0"
          step="0.5"
          placeholder="e.g. 2.5"
          value={durationHours}
          onChange={(e) => setDurationHours(e.target.value)}
          style={{ width: "45%" }}
        />
      </div>
      <div
        className="grid gap-2 p-2 rounded-md bg-white border border-gray-300"
        style={{
          margin: "20px"
        }}
      >
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

      <div style={{
        alignItems: "center",
        margin: "20px",
        padding: "5px",
        borderRadius: "6px",
        backgroundColor: "white",
        border: "1px solid #ccc",
      }}>

        <input
          type="text"
          id="address"
          min="0"
          step="0.5"
          placeholder="Address"
          value={durationHours}
          onChange={(e) => setDurationHours(e.target.value)}
          style={{ width: "100%" }}
        />
      </div>

      <div className="flex justify-center w-full">
        <button className="p-4 rounded-3xl bg-worange" onClick={() => { }}>
          Request Walk
        </button>
      </div>

    </div>
  );
}