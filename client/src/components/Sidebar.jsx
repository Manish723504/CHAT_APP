import React, { useContext, useEffect, useState } from "react";
import assets from "../assets/assets";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import { ChatContext } from "../../context/ChatContext";

const Sidebar = () => {
  const {
    getUsers,
    users,
    selectedUser,
    setSelectedUser: handleSelectUser, // Using ChatContext's safe function
    unseenMessages,
  } = useContext(ChatContext);

  const { logout, onlineUsers } = useContext(AuthContext);
  const [input, setInput] = useState("");

  const navigate = useNavigate();

  const filteredUsers = input
    ? users.filter((user) =>
        user.fullName?.toLowerCase().includes(input.toLowerCase())
      )
    : users;

  useEffect(() => {
    getUsers();
  }, [onlineUsers, getUsers]);

  return (
    <div
      className={`bg-[#8185B2]/10 h-full p-5 rounded-r-xl overflow-y-auto text-white scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent ${
        selectedUser ? "max-md:hidden" : ""
      }`}
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-5">
        <img src={assets.logo} alt="logo" className="w-36" />
        <div className="relative py-2 group">
          <img
            src={assets.menu_icon}
            alt="menu"
            className="max-h-5 cursor-pointer"
          />
          <div className="absolute top-full right-0 z-20 w-32 p-4 rounded-md bg-[#282142] border border-gray-600 text-gray-100 hidden group-hover:flex flex-col">
            <p
              onClick={() => navigate("/profile")}
              className="cursor-pointer text-sm hover:text-violet-400"
            >
              Edit Profile
            </p>
            <hr className="my-2 border-t border-gray-500" />
            <p
              onClick={logout}
              className="cursor-pointer text-sm hover:text-violet-400"
            >
              Logout
            </p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-[#282142] rounded-full flex items-center gap-2 py-3 px-4">
        <img src={assets.search_icon} alt="Search" className="w-3" />
        <input
          onChange={(e) => setInput(e.target.value)}
          type="text"
          aria-label="Search User"
          className="bg-transparent border-none outline-none text-white text-xs placeholder-[#c8c8c8] flex-1"
          placeholder="Search User..."
        />
      </div>

      {/* User List */}
      <div className="flex flex-col mt-4">
        {filteredUsers.length > 0 ? (
          filteredUsers.map((user) => {
            const isOnline = onlineUsers?.includes(user._id);
            const unseenCount = unseenMessages?.[user._id] || 0;

            return (
              <div
                key={user._id}
                onClick={() => handleSelectUser(user)} // Safe call
                className={`relative flex items-center gap-2 p-2 pl-4 rounded cursor-pointer hover:bg-[#282142]/30 ${
                  selectedUser?._id === user._id ? "bg-[#282142]/50" : ""
                }`}
              >
                <img
                  src={user?.profilePic || assets.avatar_icon}
                  alt="avatar"
                  className="w-[35px] h-[35px] rounded-full object-cover"
                />
                <div className="flex flex-col leading-5">
                  <p className="text-sm">{user.fullName}</p>
                  <span
                    className={`text-xs ${
                      isOnline ? "text-green-400" : "text-gray-400"
                    }`}
                  >
                    {isOnline ? "Online" : "Offline"}
                  </span>
                </div>

                {/* Unseen Message Badge */}
                {unseenCount > 0 && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 bg-violet-600 text-white text-xs font-semibold h-5 w-5 flex items-center justify-center rounded-full shadow-md">
                    {unseenCount}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <p className="text-gray-400 text-sm mt-4">No users found</p>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
