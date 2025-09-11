import React, { useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import assets from "../assets/assets";
import { AuthContext } from "../../context/AuthContext";

const ProfilePage = () => {
  const { authUser, updateProfile } = useContext(AuthContext);
  const [selectedImg, setSelectedImg] = useState(null);
  const [preview, setPreview] = useState(null);
  const [name, setName] = useState(authUser?.fullName || "");
  const [bio, setBio] = useState(authUser?.bio || "");
  const navigate = useNavigate();

  // Preview uploaded image
  useEffect(() => {
    if (!selectedImg) {
      setPreview(null);
      return;
    }
    const objectUrl = URL.createObjectURL(selectedImg);
    setPreview(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [selectedImg]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    let payload = { fullName: name, bio };

    if (selectedImg) {
      const reader = new FileReader();
      reader.readAsDataURL(selectedImg);
      reader.onload = async () => {
        payload.profilePic = reader.result;
        await updateProfile(payload);
        navigate("/");
      };
    } else {
      await updateProfile(payload);
      navigate("/");
    }
  };

  return (
    <div className="min-h-screen bg-cover bg-no-repeat flex items-center justify-center p-5">
      <div className="w-full max-w-3xl backdrop-blur-2xl text-gray-300 border-2 border-gray-600 flex items-center justify-between max-sm:flex-col-reverse rounded-lg p-5">
        
        {/* -------- Left: Form -------- */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-5 flex-1">
          <h3 className="text-lg font-medium">Profile Details</h3>

          <label htmlFor="avatar" className="flex items-center gap-3 cursor-pointer">
            <input
              onChange={(e) => setSelectedImg(e.target.files[0])}
              type="file"
              id="avatar"
              accept=".png,.jpg,.jpeg"
              hidden
            />
            <img
              src={preview || authUser?.profilePic || assets.avatar_icon}
              alt="avatar"
              className="w-12 h-12 rounded-full object-cover border border-gray-500"
            />
            Upload profile image
          </label>

          <input
            onChange={(e) => setName(e.target.value)}
            value={name}
            type="text"
            required
            placeholder="Your name"
            className="p-2 border border-gray-500 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500"
          />

          <textarea
            onChange={(e) => setBio(e.target.value)}
            value={bio}
            placeholder="Write profile bio"
            required
            className="p-2 border border-gray-500 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500"
            rows={4}
          ></textarea>

          <button
            type="submit"
            className="bg-gradient-to-r from-purple-400 to-violet-600 text-white p-2 rounded-full text-lg cursor-pointer hover:opacity-90 transition"
          >
            Save
          </button>
        </form>

        {/* -------- Right: Profile Image Preview -------- */}
        <div className="max-sm:mb-5 flex justify-center items-center">
          <img
            className="max-w-44 aspect-square rounded-full object-cover border border-gray-500"
            src={preview || authUser?.profilePic || assets.avatar_icon}
            alt="Profile Preview"
          />
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
