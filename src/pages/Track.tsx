import { useEffect, useRef, useState, useMemo } from "react";
import {
  APIProvider,
  Map,
  AdvancedMarker,
  useMap,
} from "@vis.gl/react-google-maps";
import { supabase } from "../supabaseClient";
import ProtectedRoute from "../auth/ProtectedRoute";
import { useNavigate, useParams } from "react-router";
import OwnerMenu from "../components/ownerMenu";
import WalkerMenu from "../components/walkerMenu";
import { TrajectoryLine } from "../components/TrajectoryLine";
import Loader from "../Loader";
import { WalkStatus } from "../constants/WalkStatus";
import { Rating } from "@smastrom/react-rating";
import "@smastrom/react-rating/style.css";
import { Button } from "../components/ui";

type LatLng = { lat: number; lng: number };
type Role = "owner" | "walker" | string;

type UserLocation = {
  userID: string;
  role: Role;
  name: string;
  position: LatLng;
  timestamp: string;
};

type Session = {
  id: string;
  owner_id: string;
  walker_id: string | null;
  status: string;
  start_time: string;
  compensation: number;
  duration_minutes: number;
  activity: string;
};

type SessionDetail = {
  session_id: string | undefined;
  lat: number;
  long: number;
  created_at: string | null;
};

type Message = {
  id: string;
  session_id: string;
  sender_id: string;
  message: string;
  created_at: string;
};

// calculating distances
const toRad = (v: number) => (v * Math.PI) / 180;
const haversine = (a: LatLng, b: LatLng) => {
  const R = 6371e3;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const la1 = toRad(a.lat);
  const la2 = toRad(b.lat);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h = sinDLat ** 2 + Math.cos(la1) * Math.cos(la2) * sinDLng ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
};
const within20m = (a?: LatLng | null, b?: LatLng | null) =>
  !!a && !!b && haversine(a, b) <= 20;

//calculating times
function displayTime(t: Date) {
  if (!t) return "none";
  return t.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}
function calculateTime(minutes: number) {
  const m = Math.floor(minutes);
  const s = Math.floor((minutes % 1) * 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

// draw line logic
function WalkerPath({ path }: { path: LatLng[] }) {
  const map = useMap();
  const polylineRef = useRef<google.maps.Polyline | null>(null);

  useEffect(() => {
    if (!map) return;
    if (!polylineRef.current) {
      polylineRef.current = new google.maps.Polyline({
        map,
        path,
        strokeColor: "#007BFF",
        strokeWeight: 5,
        strokeOpacity: 1,
      });
    } else {
      polylineRef.current.setPath(path);
    }
  }, [map, path]);

  return null;
}

export default function Track() {
  const navigate = useNavigate();
  const { id: sessionId } = useParams();

  const [me, setMe] = useState<{ id: string; name: string; role: Role } | null>(
    null
  );
  const [other, setOther] = useState<{
    id: string;
    name: string;
    role: Role;
  } | null>(null);
  const [dog, setDog] = useState<{
    id: string;
    name: string;
    breed: Role;
  } | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const [session, setSession] = useState<Session | null>(null);
  const [sessionStatus, setSessionStatus] = useState<string>();
  const [start, setStart] = useState<Date>();
  const [end, setEnd] = useState<Date>();
  const [displayStart, setDisplayStart] = useState<string>();
  const [displayEnd, setDisplayEnd] = useState<string>();

  const [users, setUsers] = useState<UserLocation[]>([]);
  const [myPosition, setMyPosition] = useState<LatLng | null>(null);
  const [path, setPath] = useState<LatLng[]>([]);
  const center = useMemo<LatLng>(
    () => myPosition ?? { lat: 49.24, lng: -123.05 },
    [myPosition]
  );

  const [eta, setETA] = useState<number>(0);

  const [isLoaded, setIsLoaded] = useState(false);
  const intervalRef = useRef<number | null>(null);

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const [rating, setRating] = useState(0);
  const [ratingsFormData, setRatingsFormData] = useState({
    rating: 0,
    description: "",
  });
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState("");

  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }
      // get me
      const { data: myProfile } = await supabase
        .from("profiles")
        .select("full_name, role, avatar_url")
        .eq("id", user.id)
        .single();
      setMe({
        id: user.id,
        name: myProfile?.full_name ?? "",
        role: myProfile?.role ?? "",
      });
      // get session
      const { data: s } = await supabase
        .from("sessions")
        .select("*")
        .eq("id", sessionId)
        .single();
      setSession(s);
      setSessionStatus(s.status);
      // redirect if no session
      if (!s && myProfile?.role == "walker") {
        navigate("/walker/dashboard");
        return;
      } else if (!s && myProfile?.role == "owner") {
        navigate("/owner/dashboard");
        return;
      }

      //set other
      if (myProfile?.role == "owner") {
        const { data: otherProfile } = await supabase
          .from("profiles")
          .select("full_name, role, avatar_url")
          .eq("id", s?.walker_id)
          .single();
        setOther({
          id: s?.walker_id ?? "",
          name: otherProfile?.full_name ?? "",
          role: otherProfile?.role ?? "",
        });
        // avatar is always other persons
        setAvatarUrl(otherProfile?.avatar_url ?? null);
        console.log(otherProfile);
      } else if (myProfile?.role == "walker") {
        const { data: otherProfile } = await supabase
          .from("profiles")
          .select("full_name, role, avatar_url")
          .eq("id", s?.owner_id)
          .single();
        setOther({
          id: s?.owner_id ?? "",
          name: otherProfile?.full_name ?? "",
          role: otherProfile?.role ?? "",
        });
        // avatar is always other persons
        setAvatarUrl(otherProfile?.avatar_url ?? null);
        console.log(otherProfile);
      }

      const { data: dogData } = await supabase
        .from("pets")
        .select("id, name, breed")
        .eq("id", s?.pet_id)
        .single();

      setDog({ id: dogData?.id, name: dogData?.name, breed: dogData?.breed });

      setIsLoaded(true);
    })();
  }, [navigate, sessionId]);

  useEffect(() => {
    if (!sessionId) return;

    async function loadMessages() {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true });

      if (!error && data) {
        setMessages(data);
      }
    }

    loadMessages();
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId || !me) return;

    const channel = supabase
      .channel(`messages:${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          console.log("Realtime fired:", payload.new);
          setMessages((prev) => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    // cleanup is sync function
    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, me]);

  // realtime
  useEffect(() => {
    if (!me) return;

    const ch = supabase.channel("liveLocations");
    channelRef.current = ch;

    // listener
    ch.on("broadcast", { event: "location" }, (payload) => {
      const p = payload.payload as UserLocation;
      setUsers((prev) => {
        const i = prev.findIndex((u) => u.userID === p.userID);
        if (i >= 0) {
          const copy = [...prev];
          copy[i] = p;
          return copy;
        }
        return [...prev, p];
      });

      // if this is the walker, update the polyline path
      if (
        session?.walker_id &&
        p.userID === session.walker_id &&
        sessionStatus === WalkStatus.InProgress
      ) {
        setMyPosition(p.position);
        if (ownerPos && walkerPos)
          setETA(Math.round(haversine(ownerPos, walkerPos)));
        setPath((prev) => {
          const last = prev[prev.length - 1];
          if (!last || haversine(last, p.position) >= 1) {
            const newPath = [...prev, p.position];
            console.log(`Path updated: ${newPath.length} points`);
            return newPath;
          }
          return prev;
        });
      }
    });

    ch.subscribe();

    // send location
    const sendLocation = async (pos: LatLng) => {
      await ch.send({
        type: "broadcast",
        event: "location",
        payload: {
          userID: me.id,
          role: me.role,
          name: me.name,
          position: pos,
          timestamp: new Date().toISOString(),
        },
      });
    };

    let watchId: number | null = null;
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((p) => {
        const pos = { lat: p.coords.latitude, lng: p.coords.longitude };
        // setMyPosition(pos);
        sendLocation(pos);
      });

      watchId = navigator.geolocation.watchPosition(
        (p) => {
          const pos = { lat: p.coords.latitude, lng: p.coords.longitude };
          // setMyPosition(pos);
          sendLocation(pos);
        },
        () => { },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
      );
    }

    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [me, session, sessionStatus === WalkStatus.InProgress]);

  const ownerPos = users.find((u) => u.role === "owner")?.position ?? null;
  const walkerPos = users.find((u) => u.role === "walker")?.position ?? null;

  const canStart =
    session?.status === WalkStatus.Accepted &&
    within20m(ownerPos, walkerPos) &&
    sessionStatus !== WalkStatus.InProgress;

  const canEnd = (() => {
    if (!session || session.status !== WalkStatus.InProgress) return false;
    const end = new Date(session.start_time);
    end.setMinutes(end.getMinutes() + session.duration_minutes);
    return within20m(ownerPos, walkerPos) && new Date() >= end;
  })();

  const startWalk = async () => {
    if (!session) return;

    const { data, error } = await supabase
      .from("sessions")
      .update({ status: WalkStatus.InProgress })
      .eq("id", sessionId)
      .select("id, status");

    if (error) {
      console.error("Supabase update error:", error);
      return;
    }
    console.log(data);
    setSession({ ...session, status: WalkStatus.InProgress });
    setSessionStatus(WalkStatus.InProgress);
  };

  const stopInterval = () => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const endWalk = async () => {
    if (!session) return;

    console.log("endWalk called - path length:", path.length);
    console.log("Current path:", path);

    const now = new Date(Date.now());
    const formattedDate = now.toISOString().slice(0, 16);

    const { data } = await supabase
      .from("sessions")
      .update({
        status: WalkStatus.Rate,
        end_time: formattedDate,
        compensation: session.duration_minutes/60*session.compensation,
      })
      .select("start_time, end_time")
      .eq("id", session.id);

    if (data != null) {
      const row = data[0];
      setStart(new Date(row.start_time));
      setEnd(new Date(row.end_time));
    }

    const result: SessionDetail[] = [];

    for (let i = 0; i < path.length; i++) {
      const { lat, lng } = path[i];
      result.push({
        session_id: sessionId,
        lat: lat,
        long: lng,
        created_at: new Date().toISOString(),
      });
    }

    console.log(
      `Preparing to save ${result.length} location points to session_detail`
    );

    if (result.length === 0) {
      console.warn("WARNING: No location points to save! Path array is empty.");
      alert("Warning: No location data was collected during this walk.");
    } else {
      const { error } = await supabase.from("session_detail").insert(result);

      if (error) {
        console.error("Insert failed:", error);
        console.error("Error code:", error.code);
        console.error("Error message:", error.message);
        alert("Error saving location data: " + error.message);
      } else {
        console.log(
          `Successfully saved ${result.length} location points to session_detail`
        );
      }
    }

    await supabase
      .from('messages')
      .delete()
      .eq('session_id', session.id);

    setSession({ ...session, status: WalkStatus.Rate });
    setSessionStatus(WalkStatus.Rate);
  };

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  if (!isLoaded)
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-wsage flex items-center justify-center">
          <div className="text-white text-xl">Loading map…</div>
        </div>
      </ProtectedRoute>
    );

  const startCheckingForWalkerRequests = async () => {
    console.log("Going to start looking for walkers");

    if (intervalRef.current !== null) return;
    intervalRef.current = window.setInterval(async () => {
      const { data, error } = await supabase
        .from("sessions")
        .select("status")
        .eq("id", sessionId)
        .single();

      console.log("Waiting for walker to accept:", data);

      if (data?.status == WalkStatus.Accepted) {
        if (me?.role == "owner") {
        const { data: otherProfile } = await supabase
          .from("profiles")
          .select("full_name, role, avatar_url")
          .eq("id", session?.walker_id)
          .single();
        setOther({
          id: session?.walker_id ?? "",
          name: otherProfile?.full_name ?? "",
          role: otherProfile?.role ?? "",
        });
        // avatar is always other persons
        setAvatarUrl(otherProfile?.avatar_url ?? null);
        console.log(otherProfile);
      } else if (me?.role == "walker") {
        const { data: otherProfile } = await supabase
          .from("profiles")
          .select("full_name, role, avatar_url")
          .eq("id", session?.owner_id)
          .single();
        setOther({
          id: session?.owner_id ?? "",
          name: otherProfile?.full_name ?? "",
          role: otherProfile?.role ?? "",
        });
        // avatar is always other persons
        setAvatarUrl(otherProfile?.avatar_url ?? null);
        console.log(otherProfile);
      }
        stopInterval();
        setSessionStatus(WalkStatus.Accepted);
        
        startCheckingForWalkStart();
      }
    }, 2000);
  };

  const startCheckingForWalkStart = async () => {
    console.log("Going to start checking if the walker has started walk.");

    if (intervalRef.current !== null) return;
    intervalRef.current = window.setInterval(async () => {
      const { data, error } = await supabase
        .from("sessions")
        .select("status")
        .eq("id", sessionId)
        .single();

      if (data != null && data.status == WalkStatus.InProgress) {
        setSessionStatus(WalkStatus.InProgress);
        stopInterval();
      }
    }, 2000);
    return;
  };

  const startCheckingForWalkEnd = async () => {
    console.log("Going to start checking for walk end.");

    if (intervalRef.current !== null) return;
    intervalRef.current = window.setInterval(async () => {
      const { data, error } = await supabase
        .from("sessions")
        .select("status, start_time, end_time")
        .eq("id", sessionId)
        .single();

      if (data != null && data.status == WalkStatus.Rate) {
        setDisplayStart(displayTime(new Date(data.start_time)));
        setDisplayEnd(displayTime(new Date(data.end_time)));
        setSessionStatus(WalkStatus.Rate);
        stopInterval();
      }
    }, 2000);
    return;
  };

  const getTimes = async () => {
    const { data, error } = await supabase
      .from("sessions")
      .select("status, start_time, end_time")
      .eq("id", sessionId)
      .single();
    console.log("in rate status and checking for data", data);

    const now = new Date(Date.now());
    const formattedDate = now.toISOString().slice(0, 16);

    const start = new Date(session!.start_time);
    const durationMs = now.getTime() - start.getTime();
    console.log(' durationMs:', durationMs)
    const durationHours = durationMs / 1000 / 60/60;
    console.log(' durationHours:', durationHours)
    const finalBill = durationHours * session!.compensation;
    console.log(' finalBill:', finalBill)
    
    if (data != null && data.status == WalkStatus.Rate) {
      console.log("in rate status and checking for data", data);
      setDisplayStart(displayTime(new Date(data.start_time)));
      setDisplayEnd(displayTime(new Date(data.end_time)));
    }
  };

  if (sessionStatus == WalkStatus.Pending) {
    startCheckingForWalkerRequests();
  } else if (sessionStatus == WalkStatus.Accepted) {
    startCheckingForWalkStart();
  } else if (sessionStatus == WalkStatus.InProgress) {
    startCheckingForWalkEnd();
  } else if (sessionStatus == WalkStatus.Rate) {
    getTimes();
  }

  const handleSkipReviewButtonClick = () => {
    navigate("/owner/dashboard");
  };

  const handleRatingFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const now = new Date(Date.now());
      const formattedDate = now.toISOString().slice(0, 16);

      const { data, error } = await supabase
        .from("walk_review")
        .insert({
          session_id: sessionId,
          created_at: formattedDate,
          rating: ratingsFormData.rating,
          description: ratingsFormData.description,
        })
        .select("session_id");

      const insertedId = data?.[0]?.session_id;

      if (!insertedId) {
        console.warn("Something went wrong when submitting your review.");
        alert(
          "Something went wrong when submitting your review. Please skip or try again later."
        );
        return;
      }

      await supabase
        .from("sessions")
        .update({
          status: WalkStatus.Completed,
        })
        .eq("id", sessionId);

      navigate("/owner/dashboard");

      if (error) {
        console.error("Error creating request:", error);
        alert("Error creating request: " + error.message);
        return;
      }
    } catch (error) {
      console.error("Unexpected error:", error);
      alert("Unexpected error creating request");
    }
  };

  const completeWalk = async () => {
    if (!session) return;

    const { error } = await supabase
      .from("sessions")
      .update({
        status: WalkStatus.Completed,
        end_time: new Date().toISOString(),
      })
      .eq("id", session.id);

    if (error) {
      console.error("Supabase update error:", error);
      return;
    }

    navigate("/walker/dashboard");
  };

  async function sendMessage() {
    if (!chatInput.trim()) return;
    if (!me) return;
    const { data: user } = await supabase.auth.getUser();

    console.log("auth.uid():", user?.user?.id);
    console.log("me.id:", me?.id);

    await supabase.from("messages").insert({
      session_id: sessionId,
      sender_id: me.id,
      message: chatInput.trim(),
    });

    console.log("INSERTING:", {
      session_id: sessionId,
      sender_id: me?.id,
      message: chatInput,
    });

    console.log("MESSAGES STATE:", messages);

    setChatInput("");
  }

  return (
    <ProtectedRoute>
      {me?.role === "owner" && <OwnerMenu />}
      {me?.role === "walker" && <WalkerMenu />}

      <APIProvider apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}>
        <Map
          mapId={import.meta.env.VITE_GOOGLE_MAP_ID}
          style={{ width: "100vw", height: "78%" }}
          center={center}
          defaultZoom={17}
          disableDefaultUI
          clickableIcons={false}
        >
          {users.map((u) => {
            const color =
              u.role === "walker"
                ? "#007BFF"
                : u.role === "owner"
                  ? "#28A745"
                  : "#6C757D";
            return (
              <AdvancedMarker key={u.userID} position={u.position}>
                <div
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: "50%",
                    backgroundColor: color,
                    border: "2px solid white",
                  }}
                  title={u.name}
                />
              </AdvancedMarker>
            );
          })}

          <TrajectoryLine
            path={path}
            options={{
              strokeColor: "#ff6200ff",
              strokeOpacity: 1.0,
              strokeWeight: 3,
            }}
          />

          {myPosition && (
            <AdvancedMarker position={myPosition}>
              <div
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: "50%",
                  backgroundColor: "#FE7F2D",
                  border: "3px solid white",
                }}
                title="You"
              />
            </AdvancedMarker>
          )}

          {sessionStatus === WalkStatus.InProgress && path.length > 1 && (
            <WalkerPath path={path} />
          )}
        </Map>
      </APIProvider>

      {/*Green Div Part*/}
      <div
        className={`absolute bottom-0 w-full ${sessionStatus === WalkStatus.InProgress
          ? "h-[46%]"
          : sessionStatus === WalkStatus.Rate
            ? "h-[70%]"
            : "h-[30%]"
          } rounded-t-xl bg-wsage/85 backdrop-blur-sm p-5`}
      >
        {sessionStatus !== WalkStatus.Pending &&(
          <p className="text-center text-yellow-500 font-bold text-2xl pt-4 capitalize">
          {other?.role} : {other?.name}
        </p>
        )}
        {sessionStatus === WalkStatus.Pending &&(
          <p className="invisible text-center text-yellow-500 font-bold text-2xl pt-4 capitalize">
          {other?.role} : {other?.name}
        </p>
        )}
        <div className="flex flex-col items-center justify-center w-full">
          {/* STATUS: PENDING */}
          {me?.role === "owner" && sessionStatus === WalkStatus.Pending && (
            <div className="w-full flex-col justify-center py-4">
              <Loader />
              <p className="text-center text-white text-xl pt-4">Finding walker</p>
            </div>
          )}
          {me?.role === "walker" && sessionStatus === WalkStatus.Pending && (
            <div className="invisible w-full flex justify-center">
              <Loader />
            </div>
          )}

          {/* STATUS: ACCEPTED ETA LOGIC */}
          {sessionStatus === WalkStatus.Accepted && ownerPos && walkerPos && (
            <div className="text-white text-xl py-4 pt-8 text-center">
              {/* OWNER VIEW */}
              {me?.role === "owner" && (
                <>
                  <div>
                    ETA: {eta} Mins
                  </div>
                  <div className="mt-2">Waiting for walker</div>
                </>
              )}

              {/* WALKER VIEW — invisible placeholder for layout */}
              {me?.role === "walker" && (
                <div className="invisible">
                  ETA: {eta} Mins
                </div>
              )}
            </div>
          )}


          {/* WALKER VIEW */}
          {me?.role === "walker" && (
            <>
              {/* WALKER ACCEPTED*/}
              {sessionStatus === WalkStatus.Accepted && (
                <div className="w-full p-5 rounded-t-xl">
                  <div className="flex flex-col items-center gap-4">
                    {!canStart && (
                      <div className="text-white text-xl py-2 px-4 rounded-md text-center">
                        Walk to owner {canStart}
                      </div>
                    )}
                    <button
                      onClick={startWalk}
                      className="bg-wblue text-white px-4 py-2 rounded-md w-full text-center"
                    >
                      Start Walk
                    </button>
                  </div>
                </div>
              )}
              {/* WALKER IN PROGRESS*/}
              {sessionStatus === WalkStatus.InProgress && (
                <div className="w-full p-5 rounded-t-xl">
                  <div className="flex flex-col gap-4">
                    {/* Chat box */}
                    <div
                      ref={chatRef}
                      className="w-full h-32 bg-gray-700/60 rounded-md p-2 overflow-y-auto text-left"
                    >
                      {messages.length === 0 ? (
                        <p className="text-gray-300 text-sm text-center mt-4">
                          Start the conversation…
                        </p>
                      ) : (
                        messages.map((m) => (
                          <div
                            key={m.id}
                            className={`text-sm my-1 ${m.sender_id === me.id
                              ? "text-blue-300 text-right"
                              : "text-white text-left"
                              }`}
                          >
                            {m.message}
                          </div>
                        ))
                      )}
                    </div>

                    {/* Chat Input */}
                    <div className="flex">
                      <input
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            sendMessage();
                          }
                        }}
                        placeholder="Message..."
                        className="flex-grow bg-gray-700 text-white px-3 py-2 rounded-l-md focus:outline-none"
                      />
                      <button
                        onClick={sendMessage}
                        className="bg-worange text-white px-4 rounded-r-md"
                      >
                        Send
                      </button>
                    </div>

                    {/* End Walk */}
                    <button
                      onClick={endWalk}
                      className="bg-wblue text-white px-4 py-2 rounded-md w-full text-center"
                    >
                      End Walk
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* OWNER VIEW: IN PROGRESS (chat styled same as walker) */}
          {me?.role === "owner" && sessionStatus === WalkStatus.InProgress && (
            <div className="w-full p-5 rounded-t-xl">
              <div className="flex flex-col gap-4">
                {/* Messages */}
                <div
                  ref={chatRef}
                  className="w-full h-32 bg-gray-600 rounded-md p-2 overflow-y-auto text-left"
                >
                  {messages.length === 0 ? (
                    <p className="text-gray-300 text-sm text-center mt-4">
                      Start the conversation…
                    </p>
                  ) : (
                    messages.map((m) => (
                      <div
                        key={m.id}
                        className={`text-sm my-1 ${m.sender_id === me.id
                          ? "text-blue-300 text-right"
                          : "text-white text-left"
                          }`}
                      >
                        {m.message}
                      </div>
                    ))
                  )}
                </div>

                {/* Input */}
                <div className="w-full flex">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    placeholder="Message..."
                    className="flex-grow bg-gray-600 text-white px-3 py-2 rounded-l-md focus:outline-none"
                  />
                  <button
                    onClick={sendMessage}
                    className="bg-worange text-white px-4 rounded-r-md"
                  >
                    Send
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TIME + IN PROGRESS LABEL
          {me?.role === "walker" &&
            sessionStatus === WalkStatus.InProgress &&
            start && (
              <div className="invisible text-white font-medium py-2 px-4 rounded-md text-center">
                TIME REMAINING:{" "}
                {calculateTime((Date.now() - start.getTime()) / 60000)}
              </div>
            )}
          {sessionStatus === WalkStatus.InProgress && (
            <div className="text-white font-medium py-2 px-4 rounded-md text-center">
              IN PROGRESS
            </div>
          )} */}

          {/* OWNER VIEW: RATE */}
          {me?.role === "owner" && sessionStatus === WalkStatus.Rate && (
            <>
              <div className="w-full -top-5 text-left px-4">
                <p className="text-xl text-white">Dog: {dog?.name}</p>
                <p className="text-xl text-white">Breed: {dog?.breed}</p>
                <p className="text-xl text-white">
                  Duration: {displayStart} - {displayEnd}
                </p>
                {session?.activity && (
                  <p className="text-xl text-white">
                    Activities: {session.activity}
                  </p>
                )}
              </div>

              <form onSubmit={handleRatingFormSubmit}>
                <div className="flex gap-4 justify-center mb-5">
                  <Rating
                    style={{ maxWidth: 180 }}
                    value={rating}
                    onChange={(value: number) => {
                      setRatingsFormData((prev) => ({
                        ...prev,
                        rating: value,
                      }));
                      setRating(value);
                    }}
                  />
                </div>

                <div className="w-full h-auto border border-white-300">
                  <input
                    className="bg-white text-black w-75 h-50 text-center"
                    type="text"
                    placeholder="Enter your review here."
                    onChange={(e) =>
                      setRatingsFormData((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="flex gap-4 justify-center mt-5">
                  <button
                    className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-medium py-2 px-6 rounded-md"
                    type="button"
                    onClick={handleSkipReviewButtonClick}
                  >
                    Skip
                  </button>

                  <button
                    className="bg-worange/75 hover:bg-worange text-white font-medium py-2 px-6 rounded-md"
                    type="submit"
                  >
                    Submit
                  </button>
                </div>
              </form>
            </>
          )}
          {/* WALKER VIEW: SUMMARY */}
          {me?.role === "walker" && sessionStatus === WalkStatus.Rate && (
            <div className="w-full p-5 rounded-t-xl">
              <h2 className="text-2xl text-white font-bold text-center mb-4 h-20">
                WALK COMPLETED
              </h2>

              <div className="text-center text-white mb-4 h-50">
                <p className="text-xl">Dog: {dog?.name}</p>
                <p className="text-xl">Breed: {dog?.breed}</p>
                <p className="text-xl">
                  Duration: {displayStart} - {displayEnd}
                </p>
                {session?.activity && (
                  <p className="text-xl">Activities: {session.activity}</p>
                )}
              </div>
              <Button
                className="mx-auto block rounded-3xl px-6 py-4 text-lg font-semibold flex items-center justify-center gap-2"
                onClick={completeWalk}
              >
                Finish
              </Button>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
