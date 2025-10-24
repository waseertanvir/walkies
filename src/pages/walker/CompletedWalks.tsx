import { useNavigate } from "react-router";
import { ChevronLeft } from "lucide-react";
import ProtectedRoute from "../../auth/ProtectedRoute";
import { Card } from "../../components/ui";

export default function CompletedWalks() {
  const navigate = useNavigate();

  const mockWalks = [
    {
      id: 1,
      pet_name: "Buddy",
      owner_name: "Sarah Johnson",
      date: "Oct 12, 2025",
      time: "2:30 PM",
    },
    {
      id: 2,
      pet_name: "Luna",
      owner_name: "Michael Chen",
      date: "Oct 15, 2025",
      time: "10:00 AM",
    },
    {
      id: 3,
      pet_name: "Rocky",
      owner_name: "Emma Davis",
      date: "Oct 18, 2025",
      time: "1:45 PM",
    },
  ];

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#233d4d] p-4">
        <div className="absolute top-4 left-4 z-50">
          <button
            onClick={() => navigate("/walker/dashboard")}
            className="bg-wolive text-black p-2 rounded-full shadow-lg hover:bg-green-600 transition-colors"
          >
            <ChevronLeft size={30} />
          </button>
        </div>

        <div className="max-w-6xl mx-auto mt-16">
          <h1 className="text-3xl font-bold text-white mb-6 text-center">
            Completed Walks
          </h1>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {mockWalks.map((walk) => (
              <Card
                key={walk.id}
                className="bg-[#D9D9D9] p-4 rounded-2xl shadow-md flex flex-col items-center text-center"
              >
                <div className="w-24 h-24 rounded-full bg-gray-300 border border-gray-400 mb-3"></div>
                <h2 className="text-xl font-semibold text-wblue mb-1">
                  {walk.pet_name}
                </h2>
                <p className="text-gray-700 text-sm mb-1">
                  Owner: {walk.owner_name}
                </p>
                <p className="text-gray-600 text-sm">
                  {walk.date} • {walk.time}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
