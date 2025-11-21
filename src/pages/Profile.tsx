// import { useState, useEffect } from 'react';
// import { useNavigate } from 'react-router';
// import { supabase } from '../supabaseClient';
// import ProtectedRoute from '../auth/ProtectedRoute';
// import { Card, Button } from '../components/ui';
// import { ChevronLeft } from 'lucide-react';

// interface Profile {
//   id: string;
//   full_name: string;
//   role: string;
//   phone: string;
//   bio?: string;
//   years_experience?: number;
//   email: string;
// }

// interface Pet {
//   id: string;
//   name: string;
//   breed: string;
//   description: string;
// }

// export default function Profile() {
//   const navigate = useNavigate();
//   const [profile, setProfile] = useState<Profile | null>(null);
//   const [pets, setPets] = useState<Pet[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [profileLoading, setProfileLoading] = useState(false);
//   const [petLoading, setPetLoading] = useState(false);
//   const [isNewUser, setIsNewUser] = useState(false);
//   const [canChangeRole, setCanChangeRole] = useState(false);

//   // Form state
//   const [formData, setFormData] = useState({
//     full_name: '',
//     phone: '',
//     role: '',
//     bio: '',
//     years_experience: 0
//   });

//   // Pet form state
//   const [petFormData, setPetFormData] = useState({
//     name: '',
//     breed: '',
//     description: ''
//   });

//   useEffect(() => {
//     const fetchProfileAndPets = async () => {
//       try {
//         const { data: { user } } = await supabase.auth.getUser();
//         if (!user) return;

//         // Fetch profile
//         const { data: profileData } = await supabase
//           .from('profiles')
//           .select('*')
//           .eq('id', user.id)
//           .single();

//         if (profileData) {
//           setProfile(profileData);
//           setFormData({
//             full_name: profileData.full_name || '',
//             phone: profileData.phone || '',
//             role: profileData.role || '',
//             bio: profileData.bio || '',
//             years_experience: profileData.years_experience || 0
//           });

//           // Check if this is a new user (incomplete profile)
//           const isIncomplete = !profileData.full_name || !profileData.phone || !profileData.role;
//           setIsNewUser(isIncomplete);

//           // Allow role change for new users or if profile was created recently (within 5 minutes)
//           const profileAge = Date.now() - new Date(profileData.created_at).getTime();
//           const isRecent = profileAge < 5 * 60 * 1000; // 5 minutes
//           setCanChangeRole(isIncomplete || isRecent);

//           // Auto-populate name from email for new users
//           if (isIncomplete && user.email) {
//             const emailName = user.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
//             setFormData(prev => ({ ...prev, full_name: emailName }));
//           }
//         } else {
//           // No profile exists, create a basic one
//           setIsNewUser(true);
//           setCanChangeRole(true);
          
//           // Auto-populate name from email
//           if (user.email) {
//             const emailName = user.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
//             setFormData(prev => ({ ...prev, full_name: emailName }));
//           }
//         }

//         // Fetch pets if user is owner
//         if (profileData?.role === 'owner') {
//           const { data: petsData } = await supabase
//             .from('pets')
//             .select('*')
//             .eq('owner_id', user.id)
//             .order('created_at', { ascending: false });

//           setPets(petsData || []);
//         }
//       } catch (error) {
//         console.error('Error fetching profile:', error);
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchProfileAndPets();
//   }, []);

//   const saveProfile = async () => {
//     setProfileLoading(true);
//     try {
//       const { data: { user } } = await supabase.auth.getUser();
//       if (!user) return;

//       const { error } = await supabase
//         .from('profiles')
//         .upsert({
//           id: user.id,
//           email: user.email,
//           full_name: formData.full_name,
//           phone: formData.phone,
//           role: formData.role,
//           bio: formData.bio || null,
//           years_experience: formData.years_experience || null
//         });

//       if (error) {
//         console.error('Error saving profile:', error);
//         alert('Error saving profile: ' + error.message);
//         return;
//       }

//       // If not a new user, disable role changing after save
//       if (!isNewUser) {
//         setCanChangeRole(false);
//       }

//       alert('Profile saved successfully!');
      
//       // If this was a new user, redirect to dashboard
//       if (isNewUser) {
//         navigate('/');
//       }
//     } catch (error) {
//       console.error('Unexpected error:', error);
//       alert('Unexpected error saving profile');
//     } finally {
//       setProfileLoading(false);
//     }
//   };

//   const savePet = async () => {
//     if (!petFormData.name || !petFormData.breed) {
//       alert('Please fill in pet name and breed');
//       return;
//     }

//     setPetLoading(true);
//     try {
//       const { data: { user } } = await supabase.auth.getUser();
//       if (!user) return;

//       const { error } = await supabase
//         .from('pets')
//         .insert({
//           owner_id: user.id,
//           name: petFormData.name,
//           breed: petFormData.breed,
//           description: petFormData.description || null
//         });

//       if (error) {
//         console.error('Error saving pet:', error);
//         alert('Error saving pet: ' + error.message);
//         return;
//       }

//       // Refresh pets list
//       const { data: petsData } = await supabase
//         .from('pets')
//         .select('*')
//         .eq('owner_id', user.id)
//         .order('created_at', { ascending: false });

//       setPets(petsData || []);
//       setPetFormData({ name: '', breed: '', description: '' });
//       alert('Pet added successfully!');
//     } catch (error) {
//       console.error('Unexpected error:', error);
//       alert('Unexpected error saving pet');
//     } finally {
//       setPetLoading(false);
//     }
//   };

//   const deletePet = async (petId: string) => {
//     if (!confirm('Are you sure you want to delete this pet?')) return;

//     try {
//       const { error } = await supabase
//         .from('pets')
//         .delete()
//         .eq('id', petId);

//       if (error) {
//         console.error('Error deleting pet:', error);
//         alert('Error deleting pet: ' + error.message);
//         return;
//       }

//       setPets(prev => prev.filter(pet => pet.id !== petId));
//       alert('Pet deleted successfully!');
//     } catch (error) {
//       console.error('Unexpected error:', error);
//       alert('Unexpected error deleting pet');
//     }
//   };

//   const handleSignOut = async () => {
//     await supabase.auth.signOut();
//     navigate('/login');
//   };

//   if (loading) {
//     return (
//       <ProtectedRoute>
//         <div className="min-h-screen bg-wblue flex items-center justify-center">
//           <div className="text-white text-xl">Loading...</div>
//         </div>
//       </ProtectedRoute>
//     );
//   }

//   return (
//     <ProtectedRoute>
//       <div className="min-h-screen bg-wblue p-4">
//         <div className="max-w-2xl mx-auto">
//           {/* <div className="flex items-center mb-6">
//             <Button variant="secondary" onClick={() => navigate('/')} className="mr-4">
//               ← Back
//             </Button>
//             <h1 className="text-2xl font-bold text-white">Profile</h1>
//           </div> */}
//           <div className="absolute top-4 left-4 z-50">
//             <button
//             onClick={() => navigate("/userprofile")} // Go back to userprofile
//               className="bg-wolive text-black p-2 rounded-full shadow-lg hover:bg-green-600 transition-colors"
//             >
//             <ChevronLeft size={30} />
//             </button>
//           </div>
//           <Card>
//             <div className="space-y-6">
//               {/* Basic Profile Information */}
//               <div>
//                 <h2 className="text-lg font-semibold text-wblue mb-4">Basic Information</h2>
//                 <div className="space-y-4">
//                   <div>
//                     <label className="block text-sm font-medium text-wblue mb-1">Email</label>
//                     <input
//                       type="email"
//                       value={profile?.email || ''}
//                       disabled
//                       className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-500"
//                     />
//                   </div>

//                   <div>
//                     <label className="block text-sm font-medium text-wblue mb-1">Full Name</label>
//                     <input
//                       type="text"
//                       value={formData.full_name}
//                       onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
//                       className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-wblue"
//                       placeholder="Enter your full name"
//                     />
//                   </div>

//                   <div>
//                     <label className="block text-sm font-medium text-wblue mb-1">Phone</label>
//                     <input
//                       type="tel"
//                       value={formData.phone}
//                       onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
//                       className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-wblue"
//                       placeholder="Enter your phone number"
//                     />
//                   </div>

//                   <div>
//                     <label className="block text-sm font-medium text-wblue mb-1">Role</label>
//                     {canChangeRole ? (
//                       <select
//                         value={formData.role}
//                         onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
//                         className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-wblue"
//                       >
//                         <option value="">Select your role</option>
//                         <option value="owner">Pet Owner</option>
//                         <option value="walker">Dog Walker</option>
//                       </select>
//                     ) : (
//                       <div className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-gray-700 capitalize">
//                         {formData.role}
//                       </div>
//                     )}
//                   </div>
//                 </div>
//               </div>

//               {/* Walker Information */}
//               {formData.role === 'walker' && (
//                 <div>
//                   <h2 className="text-lg font-semibold text-wblue mb-4">Walker Information</h2>
//                   <div className="space-y-4">
//                     <div>
//                       <label className="block text-sm font-medium text-wblue mb-1">Years of Experience</label>
//                       <input
//                         type="number"
//                         min="0"
//                         value={formData.years_experience}
//                         onChange={(e) => setFormData(prev => ({ ...prev, years_experience: parseInt(e.target.value) || 0 }))}
//                         className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-wblue"
//                         placeholder="Enter years of experience"
//                       />
//                     </div>

//                     <div>
//                       <label className="block text-sm font-medium text-wblue mb-1">Bio</label>
//                       <textarea
//                         value={formData.bio}
//                         onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
//                         className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-wblue"
//                         rows={4}
//                         placeholder="Tell pet owners about yourself..."
//                       />
//                     </div>
//                   </div>
//                 </div>
//               )}

//               {/* Pet Management for Owners */}
//               {formData.role === 'owner' && (
//                 <div>
//                   <h2 className="text-lg font-semibold text-wblue mb-4">Pet Management</h2>
                  
//                   {/* Add New Pet */}
//                   <div className="mb-6 p-4 bg-gray-50 rounded-lg">
//                     <h3 className="text-md font-medium text-wblue mb-3">Add New Pet</h3>
//                     <div className="space-y-3">
//                       <div>
//                         <label className="block text-sm font-medium text-wblue mb-1">Pet Name</label>
//                         <input
//                           type="text"
//                           value={petFormData.name}
//                           onChange={(e) => setPetFormData(prev => ({ ...prev, name: e.target.value }))}
//                           className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-wblue"
//                           placeholder="Enter pet name"
//                         />
//                       </div>
//                       <div>
//                         <label className="block text-sm font-medium text-wblue mb-1">Breed</label>
//                         <input
//                           type="text"
//                           value={petFormData.breed}
//                           onChange={(e) => setPetFormData(prev => ({ ...prev, breed: e.target.value }))}
//                           className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-wblue"
//                           placeholder="Enter breed"
//                         />
//                       </div>
//                       <div>
//                         <label className="block text-sm font-medium text-wblue mb-1">Description</label>
//                         <textarea
//                           value={petFormData.description}
//                           onChange={(e) => setPetFormData(prev => ({ ...prev, description: e.target.value }))}
//                           className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-wblue"
//                           rows={3}
//                           placeholder="Describe your pet..."
//                         />
//                       </div>
//                       <Button
//                         onClick={savePet}
//                         disabled={petLoading}
//                         size="sm"
//                       >
//                         {petLoading ? 'Adding...' : 'Add Pet'}
//                       </Button>
//                     </div>
//                   </div>

//                   {/* Existing Pets */}
//                   {pets.length > 0 && (
//                     <div>
//                       <h3 className="text-md font-medium text-wblue mb-3">Your Pets</h3>
//                       <div className="space-y-3">
//                         {pets.map((pet) => (
//                           <div key={pet.id} className="p-3 border border-gray-200 rounded-lg">
//                             <div className="flex justify-between items-start">
//                               <div>
//                                 <h4 className="font-medium text-wblue">{pet.name}</h4>
//                                 <p className="text-sm text-gray-600">{pet.breed}</p>
//                                 {pet.description && (
//                                   <p className="text-sm text-gray-500 mt-1">{pet.description}</p>
//                                 )}
//                               </div>
//                               <Button
//                                 onClick={() => deletePet(pet.id)}
//                                 variant="danger"
//                                 size="sm"
//                               >
//                                 Delete
//                               </Button>
//                             </div>
//                           </div>
//                         ))}
//                       </div>
//                     </div>
//                   )}
//                 </div>
//               )}

//               {/* Save Button */}
//               <div className="pt-4 border-t flex justify-between">
//                 <Button
//                   onClick={saveProfile}
//                   disabled={profileLoading}
//                 >
//                   {profileLoading ? 'Saving...' : 'Save Profile'}
//                 </Button>
//                 <Button variant="danger" onClick={handleSignOut}>
//                   Sign Out
//                 </Button>
//               </div>
//             </div>
//           </Card>
//         </div>
//       </div>
//     </ProtectedRoute>
//   );
// }
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { supabase } from '../supabaseClient';
import ProtectedRoute from '../auth/ProtectedRoute';
import { Card, Button } from '../components/ui';
import { ChevronLeft } from 'lucide-react';

interface Profile {
  id: string;
  full_name: string;
  role: string;
  phone: string;
  bio?: string;
  years_experience?: number;
  email: string;
}

export default function Profile() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);
  const [canChangeRole, setCanChangeRole] = useState(false);

  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    role: '',
    bio: '',
    years_experience: 0
  });

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) console.error(error);

      if (profileData) {
        setProfile(profileData);
        setFormData({
          full_name: profileData.full_name || '',
          phone: profileData.phone || '',
          role: profileData.role || '',
          bio: profileData.bio || '',
          years_experience: profileData.years_experience || 0
        });

        const isIncomplete = !profileData.full_name || !profileData.phone || !profileData.role;
        setIsNewUser(isIncomplete);
        const profileAge = Date.now() - new Date(profileData.created_at).getTime();
        setCanChangeRole(isIncomplete || profileAge < 5 * 60 * 1000);
      } else {
        setIsNewUser(true);
        setCanChangeRole(true);
      }

      setLoading(false);
    };

    fetchProfile();
  }, []);

  const saveProfile = async () => {
    setProfileLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          email: user.email,
          full_name: formData.full_name,
          phone: formData.phone,
          role: formData.role,
          bio: formData.bio || null,
          years_experience: formData.years_experience || null
        });

      if (error) {
        alert('Error saving profile: ' + error.message);
        return;
      }

      if (!isNewUser) setCanChangeRole(false);
      alert('Profile saved successfully!');
      navigate('/userprofile');
    } catch (error) {
      console.error(error);
      alert('Unexpected error saving profile');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  if (loading)
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-wblue flex items-center justify-center text-white text-xl">
          Loading...
        </div>
      </ProtectedRoute>
    );

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-wblue flex items-center justify-center p-4 relative">
        <div className="absolute top-4 left-4 z-50">
          <button
            onClick={() => navigate('/userprofile')}
            className="fixed top-4 left-4 z-50 bg-wsage/75 backdrop-blur-sm text-black p-2 rounded-full shadow-lg"
          >
            <ChevronLeft size={30} />
          </button>
        </div>

        <div className="w-full max-w-md">
          <Card>
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-wblue mb-4">Basic Information</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-wblue mb-1">Email</label>
                    <input
                      type="email"
                      value={profile?.email || ''}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-wblue mb-1">Full Name</label>
                    <input
                      type="text"
                      value={formData.full_name}
                      onChange={e =>
                        setFormData(prev => ({ ...prev, full_name: e.target.value }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-wblue"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-wblue mb-1">Phone</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={e =>
                        setFormData(prev => ({ ...prev, phone: e.target.value }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-wblue"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-wblue mb-1">Role</label>
                    {canChangeRole ? (
                      <select
                        value={formData.role}
                        onChange={e =>
                          setFormData(prev => ({ ...prev, role: e.target.value }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-wblue"
                      >
                        <option value="">Select your role</option>
                        <option value="owner">Pet Owner</option>
                        <option value="walker">Dog Walker</option>
                      </select>
                    ) : (
                      <div className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-gray-700 capitalize">
                        {formData.role}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {formData.role === 'walker' && (
                <div>
                  <h2 className="text-lg font-semibold text-wblue mb-4">Walker Information</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-wblue mb-1">
                        Years of Experience
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={formData.years_experience}
                        onChange={e =>
                          setFormData(prev => ({
                            ...prev,
                            years_experience: parseInt(e.target.value) || 0
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-wblue"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-wblue mb-1">Bio</label>
                      <textarea
                        value={formData.bio}
                        onChange={e =>
                          setFormData(prev => ({ ...prev, bio: e.target.value }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-wblue"
                        rows={4}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-4 border-t flex justify-between">
                <Button onClick={saveProfile} disabled={profileLoading}>
                  {profileLoading ? 'Saving...' : 'Save Profile'}
                </Button>
                <Button variant="danger" onClick={handleSignOut}>
                  Sign Out
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  );
}
