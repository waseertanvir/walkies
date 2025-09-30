import React, { useState } from "react";

type Role = "owner" | "walker";

interface Profile {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: Role | "";
}

interface Owner {
  petName: string;
  breed: string;
  numPets: number;
  petInfo: string;
}

interface Walker {
  experience: string;
  rate: string; 
  availability: string;
  bio: string;
}

export default function Forms() {
  const [step, setStep] = useState(1);

  const [profile, setProfile] = useState<Profile>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    role: "",
  });

  const [owner, setOwner] = useState<Owner>({
    petName: "",
    breed: "",
    numPets: 1,
    petInfo: "",
  });

  const [walker, setWalker] = useState<Walker>({
    experience: "",
    rate: "",
    availability: "",
    bio: "",
  });

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setProfile({ ...profile, [name]: value });
  };

  const handleOwnerChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setOwner({ ...owner, [name]: value });
  };

  const handleWalkerChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setWalker({ ...walker, [name]: value });
  };

  const nextStep = () => {
    if (step === 1 && profile.role !== "") {
      setStep(2);
    }
  };

  const submitForm = () => {
    let data: any = profile;
    if (profile.role === "owner") {
      data = { ...profile, ownerInfo: owner };
    } else if (profile.role === "walker") {
      data = { ...profile, walkerInfo: walker };
    }
    console.log(data);
    alert("Form submitted! Check console for data.");
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-200 p-5">
      <div className="bg-white p-6 rounded-lg shadow-md w-full max-w-md">
        {/* STEP 1: Profile */}
        {step === 1 && (
          <div>
            <h2 className="text-xl font-bold mb-4">Profile</h2>
            <div className="flex flex-col gap-3">
              <input
                type="text"
                name="firstName"
                placeholder="First Name"
                value={profile.firstName}
                onChange={handleProfileChange}
                className="border p-2 rounded"
              />
              <input
                type="text"
                name="lastName"
                placeholder="Last Name"
                value={profile.lastName}
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
                placeholder="Phone"
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
              className="bg-blue-500 text-white px-4 py-2 rounded mt-4"
              disabled={profile.role === ""}
            >
              Next
            </button>
          </div>
        )}

        {/* STEP 2: Owner Form */}
        {step === 2 && profile.role === "owner" && (
          <div>
            <h2 className="text-xl font-bold mb-4">Pet Info</h2>
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
              <input
                type="number"
                name="numPets"
                value={owner.numPets}
                onChange={handleOwnerChange}
                className="border p-2 rounded"
              />
              <textarea
                name="petInfo"
                placeholder="Pet notes"
                value={owner.petInfo}
                onChange={handleOwnerChange}
                className="border p-2 rounded"
              />
            </div>
            <button
              onClick={submitForm}
              className="bg-green-600 text-white px-4 py-2 rounded mt-4"
            >
              Submit
            </button>
          </div>
        )}

        {/* STEP 2: Walker Form */}
        {step === 2 && profile.role === "walker" && (
          <div>
            <h2 className="text-xl font-bold mb-4">Walker Setup</h2>
            <div className="flex flex-col gap-3">
              <input
                type="text"
                name="experience"
                placeholder="Years of Experience"
                value={walker.experience}
                onChange={handleWalkerChange}
                className="border p-2 rounded"
              />
              <input
                type="text"
                name="rate"
                placeholder="$21.00 per hour"
                value={walker.rate}
                onChange={handleWalkerChange}
                className="border p-2 rounded"
              />
              <input
                type="text"
                name="availability"
                placeholder="Availability (e.g. Weekdays 9am-5pm)"
                value={walker.availability}
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
              className="bg-green-600 text-white px-4 py-2 rounded mt-4"
            >
              Submit
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
