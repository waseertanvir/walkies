import { useLocation, useNavigate } from 'react-router';
import profileBanner from '../../assets/profile_banner.png';
import { Star, BadgeCheck } from "lucide-react";
import '../App.css'

export default function WalkerProfile() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = location.state?.user;

  if (!user) {
    return <div>User not found</div>;
  }

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

        <div className="profile-details">
          <p>${user.price || '30'} per dog</p>
          <p>Capacity {user.capacity || '2/3'} Dogs</p>
        </div>

        <div className="button-row">
          <button className="back-btn" onClick={() => navigate('/owner/dashboard', { state: { selectedUser: user } })}>
            Back
          </button>
          <button className="request-btn">
            Request Walk
          </button>
        </div>
      </div>
    </div>
  );
}