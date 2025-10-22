import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { supabase } from '../supabaseClient';
import ProtectedRoute from '../auth/ProtectedRoute';
import { Card, StatusPill, Button, FloatingActionButton } from '../components/ui';

interface UserProfile {
  id: string;
  full_name: string;
  role: string;
  bio?: string;
  years_experience?: number;
}

interface ActiveRequest {
  id: string;
  status: string;
  start_time: string;
  duration_minutes: number;
  compensation: number;
  pet_name?: string;
  walker_name?: string;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [activeRequest, setActiveRequest] = useState<ActiveRequest | null>(null);
  const [stats, setStats] = useState({
    completedWalks: 0,
    upcomingRequests: 0,
    totalEarnings: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        setProfile(profileData);

        const { data: requestsData } = await supabase
          .from('sessions')
          .select('*')
          .or(`owner_id.eq.${user.id},walker_id.eq.${user.id}`)
          .in('status', ['accepted', 'in_progress', 'pending']);

        const activeReq = requestsData?.find(req => 
          req.status === 'accepted' || req.status === 'in_progress'
        );

        if (activeReq) {
          // Fetch pet name
          let petName = 'Unknown Pet';
          if (activeReq.pet_id) {
            const { data: petData } = await supabase
              .from('pets')
              .select('name')
              .eq('id', activeReq.pet_id)
              .single();
            petName = petData?.name || 'Unknown Pet';
          }

          // Fetch walker name
          let walkerName = 'Unknown Walker';
          if (activeReq.walker_id) {
            const { data: walkerData } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', activeReq.walker_id)
              .single();
            walkerName = walkerData?.full_name || 'Unknown Walker';
          }

          setActiveRequest({
            id: activeReq.id,
            status: activeReq.status,
            start_time: activeReq.start_time,
            duration_minutes: activeReq.duration_minutes,
            compensation: activeReq.compensation,
            pet_name: petName,
            walker_name: walkerName
          });
        }

        const { data: completedRequests } = await supabase
          .from('sessions')
          .select('*')
          .or(`owner_id.eq.${user.id},walker_id.eq.${user.id}`)
          .eq('status', 'completed');

        const { data: pendingRequests } = await supabase
          .from('sessions')
          .select('*')
          .eq(profileData?.role === 'owner' ? 'owner_id' : 'walker_id', user.id)
          .eq('status', 'pending');

        setStats({
          completedWalks: completedRequests?.length || 0,
          upcomingRequests: pendingRequests?.length || 0,
          totalEarnings: completedRequests?.reduce((sum, req) => 
            sum + (req.walker_id === user.id ? req.compensation : 0), 0) || 0
        });

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const handleFABClick = () => {
    if (profile?.role === 'owner') {
      navigate('/requests/new');
    } else {
      navigate('/requests');
    }
  };

  const handleTrackPet = () => {
    navigate('/track');
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-wblue flex items-center justify-center">
          <div className="text-white text-xl">Loading...</div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-wblue">
        <div className="p-4 pb-20">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-white">
                Welcome back, {profile?.full_name}!
              </h1>
              <p className="text-wsage capitalize">{profile?.role}</p>
            </div>
            <Button variant="danger" size="sm" onClick={handleSignOut}>
              Sign Out
            </Button>
          </div>

          {activeRequest && (
            <Card className="mb-6 border-l-4 border-worange">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-wblue mb-2">
                    {profile?.role === 'owner' ? 'Active Walk' : 'Current Walk'}
                  </h3>
                  <p className="text-sm text-gray-600 mb-1">
                    {profile?.role === 'owner' ? 'Walker' : 'Pet'}: {activeRequest.walker_name || activeRequest.pet_name}
                  </p>
                  <p className="text-sm text-gray-600">
                    Duration: {activeRequest.duration_minutes} minutes
                  </p>
                </div>
                <div className="text-right">
                  <StatusPill status={activeRequest.status} className="mb-2" />
                  <Button size="sm" onClick={handleTrackPet}>
                    Track
                  </Button>
                </div>
              </div>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <h3 className="font-semibold text-wblue mb-2">Completed Walks</h3>
              <p className="text-2xl font-bold text-worange">{stats.completedWalks}</p>
            </Card>
            <Card>
              <h3 className="font-semibold text-wblue mb-2">Upcoming Requests</h3>
              <p className="text-2xl font-bold text-worange">{stats.upcomingRequests}</p>
            </Card>
            {profile?.role === 'walker' && (
              <Card>
                <h3 className="font-semibold text-wblue mb-2">Total Earnings</h3>
                <p className="text-2xl font-bold text-worange">${stats.totalEarnings.toFixed(2)}</p>
              </Card>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card 
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => navigate(profile?.role === 'owner' ? '/requests/new' : '/requests')}
            >
              <div className="flex items-center">
                <div className="w-12 h-12 bg-worange rounded-full flex items-center justify-center text-white text-xl mr-4">
                  {profile?.role === 'owner' ? '+' : '🔍'}
                </div>
                <div>
                  <h3 className="font-semibold text-wblue">
                    {profile?.role === 'owner' ? 'Create Request' : 'Browse Requests'}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {profile?.role === 'owner' ? 'Find a walker for your pet' : 'Find walks to apply for'}
                  </p>
                </div>
              </div>
            </Card>

            {/* My Sessions - Only for owners */}
            {profile?.role === 'owner' && (
              <Card 
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => navigate('/my-sessions')}
              >
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-wolive rounded-full flex items-center justify-center text-white text-xl mr-4">
                    📋
                  </div>
                  <div>
                    <h3 className="font-semibold text-wblue">My Sessions</h3>
                    <p className="text-sm text-gray-600">View and manage your walk sessions</p>
                  </div>
                </div>
              </Card>
            )}

            <Card 
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => navigate('/userprofile')}
            >
              <div className="flex items-center">
                <div className="w-12 h-12 bg-wsage rounded-full flex items-center justify-center text-white text-xl mr-4">
                  👤
                </div>
                <div>
                  <h3 className="font-semibold text-wblue">Profile</h3>
                  <p className="text-sm text-gray-600">Manage your account</p>
                </div>
              </div>
            </Card>
          </div>
        </div>

        <FloatingActionButton
          onClick={handleFABClick}
          className="bottom-4 left-1/2 transform -translate-x-1/2 md:bottom-6 md:right-6 md:left-auto md:transform-none md:px-6 md:py-3 md:rounded-lg md:w-auto w-14 h-14 rounded-full"
        >
          <span className="md:hidden text-xl">
            {profile?.role === 'owner' ? '+' : '🔍'}
          </span>
          <span className="hidden md:inline font-medium">
            {profile?.role === 'owner' ? 'Create Request' : 'Browse Requests'}
          </span>
        </FloatingActionButton>
      </div>
    </ProtectedRoute>
  );
}
