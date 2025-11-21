import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { ChevronLeft } from "lucide-react";
import ProtectedRoute from "../../auth/ProtectedRoute";
import { Card } from "../../components/ui";
import { supabase } from "../../supabaseClient";
import { WalkStatus } from "../../constants/WalkStatus";

interface Session {
  id: string;
  status: string;
  start_time: string;
  end_time: string | null;
  duration_minutes: number;
  compensation: number;
  pet_id: string;
  owner_id: string;
  created_at: string;
}

interface Pet {
  id: string;
  name: string;
  breed: string;
  avatar_url?: string;
}

interface OwnerProfile {
  id: string;
  full_name: string;
}

export default function CompletedWalks() {
  const navigate = useNavigate();
  const [walks, setWalks] = useState<Session[]>([]);
  const [pets, setPets] = useState<Record<string, Pet>>({});
  const [owners, setOwners] = useState<Record<string, OwnerProfile>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCompletedWalks = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
          .from("sessions")
          .select("*")
          .eq("walker_id", user.id)
          .eq("status", WalkStatus.Completed)
          .order("end_time", { ascending: false });

        setWalks(data || []);

        if (data && data.length > 0) {
          const petIds = data.map((walk) => walk.pet_id);
          const ownerIds = data.map((walk) => walk.owner_id);

          const { data: petsData } = await supabase
            .from("pets")
            .select("id, name, breed, avatar_url")
            .in("id", petIds);

          const { data: ownersData } = await supabase
            .from("profiles")
            .select("id, full_name")
            .in("id", ownerIds);

          const petsMap: Record<string, Pet> = {};
          petsData?.forEach((pet) => {
            petsMap[pet.id] = pet as Pet;
          });
          setPets(petsMap);

          const ownersMap: Record<string, OwnerProfile> = {};
          ownersData?.forEach((owner) => {
            ownersMap[owner.id] = owner;
          });
          setOwners(ownersMap);
        }
      } catch (error) {
        console.error("Error fetching completed walks:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCompletedWalks();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const handleViewDetails = (sessionId: string) => {
    navigate(`/walk-history/${sessionId}`);
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-wsage flex items-center justify-center text-white text-xl">
          Loading completed walks...
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-wblue p-4 relative overflow-hidden">
        <button
          onClick={() => navigate(-1)}
          className="fixed top-4 left-4 z-50 bg-wsage/75 backdrop-blur-sm text-black p-2 rounded-full shadow-lg"
        >
          <ChevronLeft size={30} />
        </button>

        <div className="max-w-6xl mx-auto mt-8">
          <h1 className="text-3xl font-bold text-white mb-8 text-center">
            Completed Walks
          </h1>

          {walks.length === 0 ? (
            <p className="text-white text-center mt-8">
              You haven't completed any walks yet.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {walks.map((walk) => {
                const pet = pets[walk.pet_id];
                const owner = owners[walk.owner_id];

                const displayDate = walk.end_time
                  ? formatDate(walk.end_time)
                  : formatDate(walk.start_time);

                return (
                  <Card
                    key={walk.id}
                    className="bg-[#D9D9D9] p-4 rounded-2xl shadow-md cursor-pointer hover:shadow-lg transition"
                    onClick={() => handleViewDetails(walk.id)}
                  >
                    <div className="flex items-center">
                      {pet?.avatar_url ? (
                        <img
                          src={pet.avatar_url}
                          alt={pet.name}
                          className="w-24 h-24 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-24 h-24 rounded-full bg-gray-400 flex items-center justify-center text-white text-3xl font-bold">
                          {pet?.name ? pet.name[0] : "?"}
                        </div>
                      )}
                      <div className="w-[65%] px-4">
                        <h2 className="text-xl font-semibold text-wblue mb-1 text-center">
                          {pet ? pet.name : "Unknown Pet"}
                        </h2>
                        <p className="text-sm text-gray-700 pt-1 mb-1">
                          <strong>Date:</strong> {displayDate}
                        </p>
                        <p className="text-sm text-gray-700 pt-1 mb-1">
                          <strong>Compensation:</strong> ${walk.compensation}
                        </p>
                        <p className="text-sm text-gray-700 pt-1">
                          <strong>Owner:</strong>{" "}
                          {owner ? owner.full_name : "Unknown Owner"}
                        </p>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
