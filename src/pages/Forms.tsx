import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router";

type Role = "owner" | "walker";

interface Profile {
  fullName: string;
  email: string;
  phone: string;
  role: Role | "";
}

interface OwnerPet {
  petName: string;
  breed: string;
  petInfo: string;
}

interface WalkerInfo {
  experience: number | "";
  bio: string;
}

export default function Forms() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);

  const [profile, setProfile] = useState<Profile>({
    fullName: "",
    email: "",
    phone: "",
    role: "",
  });

  const [owner, setOwner] = useState<OwnerPet>({
    petName: "",
    breed: "",
    petInfo: "",
  });

  const [walker, setWalker] = useState<WalkerInfo>({
    experience: "",
    bio: "",
  });

  // Populate email from logged-in user
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const userEmail = session?.user?.email ?? "";
      setProfile(prev => ({ ...prev, email: userEmail }));
    });
  }, []);

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
  };

  const handleOwnerChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setOwner(prev => ({ ...prev, [name]: value }));
  };

  const handleWalkerChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setWalker(prev => ({ ...prev, [name]: name === "experience" ? Number(value) : value }));
  };

  const nextStep = () => {
    if (step === 1 && profile.role !== "") setStep(2);
  };

  const submitForm = async () => {
    try {
      // Get the logged-in user ID
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;
      if (!userId) {
        alert("No logged-in user found.");
        return;
      }

      // Update profile
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: profile.fullName,
          phone: profile.phone,
          role: profile.role,
          bio: profile.role === "walker" ? walker.bio : null,
          years_experience: profile.role === "walker" ? walker.experience : null,
          created_at: new Date().toISOString(),
        })
        .eq("id", userId) // match the existing profile
        .select();

      if (profileError) {
        console.error("Profile update error:", profileError);
        alert("Error updating profile: " + profileError.message);
        return;
      }

      // If owner, update pet info or insert if it doesn’t exist
      if (profile.role === "owner") {
        // Check if pet already exists
        const { data: existingPets } = await supabase
          .from("pets")
          .select("*")
          .eq("owner_id", userId);

        if (existingPets && existingPets.length > 0) {
          // Update first pet (or you can loop for multiple pets)
          const petId = existingPets[0].id;
          const { error: petError } = await supabase
            .from("pets")
            .update({
              name: owner.petName,
              breed: owner.breed,
              description: owner.petInfo,
              created_at: new Date().toISOString(),
            })
            .eq("id", petId);
          if (petError) {
            console.error("Pet update error:", petError);
            alert("Error updating pet info: " + petError.message);
            return;
          }
        } else {
          // Insert new pet if none exists
          const { error: petInsertError } = await supabase.from("pets").insert([
            {
              owner_id: userId,
              name: owner.petName,
              breed: owner.breed,
              description: owner.petInfo,
              created_at: new Date().toISOString(),
            },
          ]);
          if (petInsertError) {
            console.error("Pet insert error:", petInsertError);
            alert("Error adding pet info: " + petInsertError.message);
            return;
          }
        }
      }

      alert("Profile updated successfully!");
      navigate("/");

    } catch (err) {
      console.error(err);
      alert("Unexpected error updating profile");
    }
  };


  return (
    <div className="flex justify-center items-center min-h-screen bg-wblue p-5">
      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
        {/* Step 1: Profile */}
        {step === 1 && (
          <div>
            <h2 className="text-xl font-bold mb-4 text-wblue">Profile</h2>
            <div className="flex flex-col gap-3">
              <input
                type="text"
                name="fullName"
                placeholder="Full Name"
                value={profile.fullName}
                onChange={handleProfileChange}
                className="border p-2 rounded"
              />
              <input
                type="email"
                name="email"
                placeholder="Email"
                value={profile.email}
                onChange={handleProfileChange}
                className="border p-2 rounded"
              />
              <input
                type="text"
                name="phone"
                placeholder="Phone (Optional)"
                value={profile.phone}
                onChange={handleProfileChange}
                className="border p-2 rounded"
              />
              <select
                name="role"
                value={profile.role}
                onChange={handleProfileChange}
                className="border p-2 rounded"
              >
                <option value="">Choose Role</option>
                <option value="owner">Owner</option>
                <option value="walker">Walker</option>
              </select>
            </div>
            <button
              onClick={nextStep}
              className="bg-worange text-white px-4 py-2 rounded mt-4 w-full"
              disabled={profile.role === ""}
            >
              Next
            </button>
          </div>
        )}

        {/* Step 2: Owner */}
        {step === 2 && profile.role === "owner" && (
          <div>
            <h2 className="text-xl font-bold mb-4 text-wblue">Pet Info</h2>
            <div className="flex flex-col gap-3">
              <input
                type="text"
                name="petName"
                placeholder="Pet Name"
                value={owner.petName}
                onChange={handleOwnerChange}
                className="border p-2 rounded"
              />
              <input
                type="text"
                name="breed"
                placeholder="Breed"
                value={owner.breed}
                onChange={handleOwnerChange}
                className="border p-2 rounded"
              />
              <textarea
                name="petInfo"
                placeholder="Pet Notes"
                value={owner.petInfo}
                onChange={handleOwnerChange}
                className="border p-2 rounded"
              />
            </div>
            <button
              onClick={submitForm}
              className="bg-wsage text-white px-4 py-2 rounded mt-4 w-full"
            >
              Submit
            </button>
          </div>
        )}

        {/* Step 2: Walker */}
        {step === 2 && profile.role === "walker" && (
          <div>
            <h2 className="text-xl font-bold mb-4 text-wblue">Walker Setup</h2>
            <div className="flex flex-col gap-3">
              <input
                type="number"
                name="experience"
                placeholder="Years of Experience"
                value={walker.experience}
                onChange={handleWalkerChange}
                className="border p-2 rounded"
              />
              <textarea
                name="bio"
                placeholder="Short Bio"
                value={walker.bio}
                onChange={handleWalkerChange}
                className="border p-2 rounded"
              />
            </div>
            <button
              onClick={submitForm}
              className="bg-wsage text-white px-4 py-2 rounded mt-4 w-full"
            >
              Submit
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
