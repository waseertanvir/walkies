import { useLocation, useNavigate } from 'react-router';
import profileBanner from '../../assets/profile_banner.png';
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
          <div className="rating">
            <span>★ 4.53 (12)</span>
          </div>
        </div>

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