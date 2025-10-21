import { useState } from "react";
import { Menu, X } from "lucide-react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router";

export default function OwnerMenu() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="absolute top-4 left-4 z-50">
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="bg-wolive text-black p-2 rounded-full"
        >
          <Menu size={30} />
        </button>
      )}
      {open && (
        <div className="bg-wolive rounded-3xl flex-row">
          <button
            onClick={() => setOpen(false)}
            className="p-2 rounded-full"
          >
            <X size={30} />
          </button>
          <ul className="w-[92vw] py-1 px-5 text-xl">
            <li>
              <button className="py-3" onClick={()=>navigate("/owner/profile")}>
                Edit Profile
              </button>
            </li>
            <li>
              <button className="py-3" onClick={()=>navigate("/owner/dogs")}>
                Edit Dogs
              </button>
            </li>
            <li>
              <button className="py-3" onClick={()=>navigate("/owner/schedule")}>
                Scheduled Walks
              </button>
            </li>
            <li>
              <button className="py-3" onClick={()=>navigate("/owner/history")}>
                Walk History
              </button>
            </li>
            <li>
              <button className="py-3" onClick={()=>navigate("/owner/payment")}>
                Payment Settings
              </button>
            </li>
            <li>
              <button className="py-3 text-red-500" onClick={async () => {
                await supabase.auth.signOut();

                navigate('/login')
              }}>
                Log Out
              </button>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
