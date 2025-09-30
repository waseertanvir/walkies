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
  availability: string;
  payRate: string;
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
    numPets: undefined as unknown as number,
    petInfo: "",
  });

  const [walker, setWalker] = useState<Walker>({
    experience: "",
    availability: "",
    payRate: "",
    bio: "",
  });

  const handleProfileChange = (e: any) => {
    const { name, value } = e.target;
    setProfile({ ...profile, [name]: value });
  };

  const handleOwnerChange = (e: any) => {
    const { name, value } = e.target;
    setOwner({ ...owner, [name]: value });
  };

  const handleWalkerChange = (e: any) => {
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
    alert("Form submitted!");
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-wblue p-5">
      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
        {step === 1 && (
          <div>
            <h2 className="text-xl font-bold mb-4 text-wblue">Profile</h2>
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
              <input
                type="number"
                name="numPets"
                value={owner.numPets}
                onChange={handleOwnerChange}
                className="border p-2 rounded"
                placeholder="Number of Pets"
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
              className="bg-wsage text-white px-4 py-2 rounded mt-4 w-full"
            >
              Submit
            </button>
          </div>
        )}

        {step === 2 && profile.role === "walker" && (
          <div>
            <h2 className="text-xl font-bold mb-4 text-wblue">Walker Setup</h2>
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
                name="availability"
                placeholder="Availability (e.g. weekdays, evenings)"
                value={walker.availability}
                onChange={handleWalkerChange}
                className="border p-2 rounded"
              />
              <input
                type="text"
                name="payRate"
                placeholder="Pay Rate (e.g. $21.00/hr)"
                value={walker.payRate}
                onChange={handleWalkerChange}
                className="border p-2 rounded"
              />
              <textarea
                name="bio"
                placeholder="Short bio"
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
