import { useLocation, useNavigate } from 'react-router';
import profileBanner from '../../assets/profile_banner.png';
import { Star, BadgeCheck } from "lucide-react";
import '../App.css'

export default function RequestWalk() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = location.state?.user;

  if (!user) {
    return <div>User not found</div>;
  }

  return (
    <div className="request-walk">
      <h1>Hello World!!!</h1>
    </div>
  );
}