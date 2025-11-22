import { data, useLocation, useNavigate } from "react-router";
import profileBanner from "../../assets/profile_banner.png";
import { Star, BadgeCheck } from "lucide-react";
import "../App.css";
import CreateRequest from "../../../src/pages/CreateRequest";
import { useState } from "react";
import { useParams } from "react-router-dom";
import { useDeviceState } from "../../DeviceStateContext";
import { Button } from "../../components/ui";
import { useEffect } from "react";
import { supabase } from "../../supabaseClient";

export default function WalkerProfile() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = location.state?.user;
  const [showRequestWalkPage, setShowRequestWalkPage] = useState(false);
  const [avgRating, setAvgRating] = useState<number | null>(null);
  const [totalReviews, setTotalReviews] = useState<number>(0);
  const [walkerBio, setWalkerBio] = useState<string | null>(null);
  const [experienceYears, setExperienceYears] = useState<number | null>(null);
  const [profilePicture, setProfilePicture] = useState<string | null>(null);

  if (!user) {
    return <div>User not found</div>;
  }

  if (showRequestWalkPage) {
    navigate("/requests/new", { state: {} });
  }

  useEffect(() => {
    const fetchWalkerData = async () => {
      const { data: sessionsData, error: sessionsError } = await supabase
        .from("sessions")
        .select("id")
        .eq("walker_id", user.userID);

      if (sessionsError) {
        console.log("Session fetch error:", sessionsError);
        return;
      }

      const sessionIds = sessionsData.map((s) => s.id);

      const { data: reviewsData, error: reviewsError } = await supabase
        .from("walk_review")
        .select("rating")
        .in("session_id", sessionIds);

      if (reviewsError) {
        console.log("Review fetch error:", reviewsError);
      }

      if (!reviewsData || reviewsData.length === 0) {
        setAvgRating(0);
        setTotalReviews(0);
      } else {
        const total = reviewsData.reduce((sum, r) => sum + r.rating, 0);
        const avg = total / reviewsData.length;
        setAvgRating(parseFloat(avg.toFixed(2)));
        setTotalReviews(reviewsData.length);
      }

      const { data: walkerData, error: walkerError } = await supabase
        .from("profiles")
        .select("bio, years_experience, avatar_url")
        .eq("id", user.userID)
        .single();

      if (walkerError) {
        console.log("Walker fetch error:", walkerError);
        setWalkerBio(null);
        setExperienceYears(null);
        setProfilePicture(null);
      } else {
        console.log(data);
        setProfilePicture(walkerData?.avatar_url);
        setWalkerBio(walkerData?.bio || null);
        setExperienceYears(walkerData?.years_experience || null);
      }
    };

    fetchWalkerData();
  }, [user.userID]);

  const { setState } = useDeviceState();

  const handleSubmitX = () => {
    setState("WAITING_TO_ACCEPT");
    navigate("/owner/dashboard");
  };

  return (
    <div className="walker-profile">
      <img src={profilePicture || profileBanner} alt={user.name} className="profile-banner" />

      <div className="profile-content">
        <div className="profile-header">
          <h1>{user.name}</h1>
        </div>

        <div className="flex justify-between rating-section">
          <div className="flex">
            <div>
              <Star />
            </div>
            <div className="ml-1">
              {avgRating !== null
                ? `${avgRating} (${totalReviews})`
                : "Loading..."}
            </div>
          </div>

          <div className="flex">
            <div>
              <BadgeCheck />
            </div>
            <div className="ml-1">Verified Walker</div>
          </div>
        </div>

        <hr className="mt-5 mb-5"></hr>

        <div className="experience-section mt-5">
          <h3 style={{ color: "#FFD700" }}>Experience</h3>
          <p>
            {experienceYears
              ? `${experienceYears} years of walking experience`
              : "Experience information not provided."}
          </p>
        </div>

        <hr className="mt-5 mb-5"></hr>

        <div className="bio-section mt-5">
          <h3 style={{ color: "#FFD700" }}>Walker's Bio</h3>
          <p>
            {walkerBio ? `${walkerBio}` : "The walker has not added a bio yet."}
          </p>
        </div>
        <div className="fixed bottom-0 left-0 w-full p-4 bg-wusage flex justify-between gap-3 shadow-md">
          <Button
            className="flex-1 bg-orange-500 hover:bg-orange-600 text-white rounded-xl px-4 py-2"
            onClick={() =>
              navigate("/owner/dashboard", { state: { selectedUser: user } })
            }
          >
            Back
          </Button>
          <Button
            className="flex-1 bg-orange-500 hover:bg-orange-600 text-white rounded-xl px-4 py-2"
            onClick={() => navigate(`/owner/schedule/${user.userID}`)}
          >
            Request Walk
          </Button>
        </div>
      </div>
    </div>
  );
}
