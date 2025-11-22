import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { supabase } from "../supabaseClient";
import ProtectedRoute from "../auth/ProtectedRoute";
import { Card, Button, StatusPill } from "../components/ui";
import { ChevronLeft } from "lucide-react";

interface Session {
  id: string;
  status: string;
  start_time: string;
  duration_minutes: number;
  compensation: number;
  notes: string;
  meeting_location: string;
  special_instructions: string;
  applications: string[];
  walker_id: string | null;
  pet_id: string;
  owner_id: string;
  created_at: string;
  type: string;
}

interface Pet {
  id: string;
  name: string;
  breed: string;
}

interface WalkerProfile {
  id: string;
  full_name: string;
}

export default function MySessions() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [pets, setPets] = useState<Record<string, Pet>>({});
  const [walkers, setWalkers] = useState<Record<string, WalkerProfile>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
          .from("sessions")
          .select("*")
          .eq("owner_id", user.id)
          .eq("is_deleted", false)
          .neq("status", "walk_completed")
          .order("created_at", { ascending: false });

        console.log("MySessions - Raw sessions data:", data);
        console.log("MySessions - User ID:", user.id);
        console.log(
          "MySessions - Applications in each session:",
          data?.map((s) => ({ id: s.id, applications: s.applications }))
        );
        setSessions(data || []);

        // Fetch pets data
        if (data && data.length > 0) {
          const petIds = data.map((session) => session.pet_id);
          const { data: petsData } = await supabase
            .from("pets")
            .select("id, name, breed")
            .in("id", petIds);

          const petsMap: Record<string, Pet> = {};
          petsData?.forEach((pet) => {
            petsMap[pet.id] = pet;
          });
          setPets(petsMap);

          // Fetch walkers data
          const walkerIds = data
            .filter((session) => session.walker_id)
            .map((session) => session.walker_id!);

          if (walkerIds.length > 0) {
            const { data: walkersData } = await supabase
              .from("profiles")
              .select("id, full_name")
              .in("id", walkerIds);

            const walkersMap: Record<string, WalkerProfile> = {};
            walkersData?.forEach((walker) => {
              walkersMap[walker.id] = walker;
            });
            setWalkers(walkersMap);
          }
        }
      } catch (error) {
        console.error("Error fetching sessions:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSessions();
  }, []);

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const handleViewApplications = (sessionId: string) => {
    navigate(`/applications/${sessionId}`);
  };

  const handleEditSession = (sessionId: string) => {
    navigate(`/owner/schedule/edit-session/${sessionId}`);
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm("Are you sure you want to delete this session?")) return;

    try {
      const { error } = await supabase
        .from("sessions")
        .update({ is_deleted: true })
        .eq("id", sessionId);

      if (error) {
        console.log(error);
        alert("Failed to remove session.");
        return;
      }

      setSessions((prev) => prev.filter((session) => session.id !== sessionId));
      alert("Session deleted successfully!");
    } catch (error) {
      console.error("Unexpected error:", error);
      alert("Unexpected error deleting session");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-wblue flex items-center justify-center">
        <div className="text-white text-xl">Loading sessions...</div>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-wblue p-4">
        <div className="max-w-4xl mx-auto">
          <div className="relative mb-6">
            {/* <Button variant="secondary" onClick={() => navigate('/')} className="mr-4">
              ← Back to Dashboard
            </Button> */}
            <button
              onClick={() => navigate("/owner/dashboard")}
              className="fixed top-4 left-4 z-50 bg-wsage/75 backdrop-blur-sm text-black p-2 rounded-full shadow-lg"
            >
              <ChevronLeft size={30} />
            </button>
            {/* <h1 className="text-2xl font-bold text-white ">My Sessions</h1> */}
            <div className="flex justify-center">
              <h1 className="text-2xl font-bold text-white text-center mt-2">
                Scheduled Walks
              </h1>
            </div>
          </div>

          {sessions.length === 0 ? (
            <Card>
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-wyellow rounded-full flex items-center justify-center text-white text-2xl mx-auto mb-4">
                  🐕
                </div>
                <h3 className="text-lg font-semibold text-wblue mb-2">
                  No Sessions Yet
                </h3>
                <p className="text-gray-600 mb-4">
                  You haven't created any walk sessions yet.
                </p>
                <Button onClick={() => navigate("/owner/schedule/")}>
                  Create Your First Session
                </Button>
              </div>
            </Card>
          ) : (
            <div className="space-y-4">
              {sessions.map((session) => (
                <Card key={session.id}>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-semibold text-wblue">
                          {pets[session.pet_id]?.name} (
                          {pets[session.pet_id]?.breed})
                        </h3>
                        <StatusPill status={session.status} />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Start Time:</span>{" "}
                            {formatDateTime(session.start_time)}
                          </p>
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Duration:</span>{" "}
                            {session.duration_minutes} minutes
                          </p>
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Compensation:</span> $
                            {session.compensation}
                          </p>
                        </div>
                        <div>
                          {session.walker_id && walkers[session.walker_id] ? (
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">
                                Selected Walker:
                              </span>{" "}
                              {walkers[session.walker_id].full_name}
                            </p>
                          ) : session.applications &&
                            session.applications.length > 0 ? (
                            <p className="text-sm text-wblue font-medium">
                              <span className="font-medium">
                                Pending Applications:
                              </span>{" "}
                              {session.applications.length} walker(s) waiting
                              for review
                            </p>
                          ) : (
                            <p className="text-sm text-gray-500">
                              <span className="font-medium">Applications:</span>{" "}
                              No applications yet
                            </p>
                          )}
                          {session.meeting_location && (
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">
                                Meeting Location:
                              </span>{" "}
                              {session.meeting_location}
                            </p>
                          )}
                        </div>
                      </div>

                      {session.notes && (
                        <div className="mb-3">
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Notes:</span>{" "}
                            {session.notes}
                          </p>
                        </div>
                      )}

                      {session.special_instructions && (
                        <div className="mb-3">
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">
                              Special Instructions:
                            </span>{" "}
                            {session.special_instructions}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="ml-4 flex flex-col space-y-2">
                      {session.applications &&
                        session.applications.length > 0 && (
                          <Button
                            onClick={() => handleViewApplications(session.id)}
                            size="sm"
                            variant="secondary"
                          >
                            View Applications ({session.applications.length})
                          </Button>
                        )}

                      {session.status === "pending" && (
                        <>
                          <Button
                            onClick={() => handleEditSession(session.id)}
                            size="sm"
                            variant="secondary"
                          >
                            Edit
                          </Button>
                          <Button
                            onClick={() => handleDeleteSession(session.id)}
                            size="sm"
                            variant="danger"
                          >
                            Delete
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
