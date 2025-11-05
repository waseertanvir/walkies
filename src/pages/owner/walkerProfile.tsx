import { useLocation, useNavigate } from 'react-router';
import profileBanner from '../../assets/profile_banner.png';
import { Star, BadgeCheck } from "lucide-react";
import '../App.css'
import CreateRequest from "../../../src/pages/CreateRequest";
import { useState } from "react";
import { useParams } from "react-router-dom";
import { useDeviceState } from "../../DeviceStateContext";

export default function WalkerProfile() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = location.state?.user;
  const [showRequestWalkPage, setShowRequestWalkPage] = useState(false);

  if (!user) {
    return <div>User not found</div>;
  }

  if (showRequestWalkPage) {
    navigate("/requests/new", { state: { } });
  }

  const { setState } = useDeviceState();

  const handleSubmitX = () => {
    setState('WAITING_TO_ACCEPT');
    navigate("/owner/dashboard");
  };

  return (
    <div className="walker-profile">
      <img src={profileBanner} alt={user.name} className="profile-banner" />

      <div className="profile-content">
        <div className="profile-header">
          <h1>{user.name}</h1>
        </div>

        <div className="flex justify-between rating-section">
          <div className="flex">
            <div><Star /></div>
            <div className="ml-1">4.53 (12)</div>
          </div>

          <div className="flex">
            <div><BadgeCheck /></div>
            <div className="ml-1">Verified Walker</div>
          </div>
        </div>

        <hr className="mt-5 mb-5"></hr>

        <div className="user-provided-quote" style={{ textAlign: "justify" }}>
          Lorem ipsum dolor sit amet, consectetur adipisicing elit. Nisi sint ad vero, corrupti est esse, repudiandae totam impedit placeat minus illo tempore dolore quasi sequi ex nesciunt voluptates rerum eligendi.
        </div>

        <hr className="mt-5 mb-5"></hr>

        <div className="dog-limit-section">
          <h3 style={{ color: "#FFD700" }}>Number of Dogs</h3>
          <p><span id="dog-limit-count">3</span> dogs per session of book a private session</p>
        </div>

        <div className="safety-section mt-5">
          <h3 style={{ color: "#FFD700" }}>Safety</h3>
          <p id="safety-description" style={{ textAlign: "justify" }}>Lorem ipsum dolor sit amet consectetur, adipisicing elit. Esse quibusdam itaque nesciunt a, sed voluptas inventore, repellendus fugit excepturi, cumque voluptates cupiditate provident aspernatur porro aperiam nostrum nulla minus earum.</p>
        </div>

        <div className="mt-5 flex justify-between">
          <button className="back-btn" onClick={() => navigate('/owner/dashboard', { state: { selectedUser: user } })}>
            Back
          </button>
          {/* <button className="back-btn" onClick={() => setShowRequestWalkPage(true)}> */}
          <button className="back-btn" onClick={() => navigate(`/owner/schedule/${user.id}`)}>
            Request Walk
          </button>
        </div>
      </div>
    </div >
  );
}