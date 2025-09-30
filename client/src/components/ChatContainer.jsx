import React, { useContext, useEffect, useRef, useState } from "react";
import assets from "../assets/assets";
import { formatMessageTime } from "../lib/utils";
import { ChatContext } from "../../context/ChatContext";
import { AuthContext } from "../../context/AuthContext";
import toast from "react-hot-toast";

const ChatContainer = () => {
  const {
    messages,
    selectedUser,
    setSelectedUser,
    sendMessage,
    getMessages,
    markSeen,
    setUnseenMessages,
  } = useContext(ChatContext);

  const { authUser, onlineUsers, socket } = useContext(AuthContext);

  const scrollEnd = useRef();
  const [input, setInput] = useState("");

  //  Send text message
  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if (input.trim() === "") return;
    await sendMessage({ text: input.trim() });
    setInput("");
  };

  //  Send image
  const handleSendImage = async (e) => {
    const file = e.target.files[0];
    if (!file || !file.type.startsWith("image/")) {
      toast.error("Select an image file");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = async () => {
      await sendMessage({ image: reader.result });
      e.target.value = "";
    };
    reader.readAsDataURL(file);
  };

  //  Fetch messages when a user is selected
  useEffect(() => {
    if (!selectedUser) return;

    getMessages(selectedUser._id);
    setUnseenMessages((prev) => ({ ...prev, [selectedUser._id]: 0 }));
  }, [selectedUser]);

  //  Auto scroll to bottom
  useEffect(() => {
    if (scrollEnd.current && messages.length > 0) {
      scrollEnd.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Mark incoming messages as seen
  useEffect(() => {
    if (!selectedUser || !socket) return;

    // Messages from selectedUser that are not yet seen
    const unseenMsgIds = messages
      .filter((msg) => msg.senderId === selectedUser._id && !msg.seen)
      .map((msg) => msg._id);

    if (unseenMsgIds.length > 0) {
      markSeen(unseenMsgIds);          // Update local state
      socket.emit("markSeen", unseenMsgIds); // Notify backend
    }

    // Listen for seen updates from backend
    const handleSeen = (seenMessageIds) => {
      markSeen(seenMessageIds);
    };
    socket.on("messagesSeen", handleSeen);

    return () => {
      socket.off("messagesSeen", handleSeen);
    };
  }, [messages, selectedUser, socket]);

  // Listen for new messages (real-time update)
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (msg) => {
      if (selectedUser && msg.senderId === selectedUser._id) {
        // If chatting with this user
        markSeen([msg._id]);
        socket.emit("markSeen", [msg._id]);
        getMessages(selectedUser._id); // refresh messages
      } else {
        // Increase unseen counter for other users
        setUnseenMessages((prev) => ({
          ...prev,
          [msg.senderId]: (prev[msg.senderId] || 0) + 1,
        }));
      }
    };

    socket.on("newMessage", handleNewMessage);

    return () => {
      socket.off("newMessage", handleNewMessage);
    };
  }, [socket, selectedUser]);

  return selectedUser ? (
    <div className="h-full flex flex-col overflow-hidden relative backdrop-blur-lg">
      {/* Header */}
      <div className="flex items-center gap-3 py-3 px-4 border-b border-stone-500 bg-gray-900/70">
        <img
          onClick={() => setSelectedUser(null)}
          src={assets.arrow_icon}
          alt="Back"
          className="md:hidden w-6 cursor-pointer"
        />
        <img
          src={selectedUser.profilePic || assets.avatar_icon}
          alt="user"
          className="w-8 rounded-full"
        />
        <p className="flex-1 text-lg text-white flex items-center gap-2">
          {selectedUser.fullName}
          {onlineUsers.includes(selectedUser._id) && (
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
          )}
        </p>
        <img
          src={assets.help_icon}
          alt="Help"
          className="hidden md:block w-5 cursor-pointer"
        />
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col overflow-y-auto p-3 pb-20">
        {messages.map((msg) => (
          <div
            key={msg._id}
            className={`flex items-end mb-6 ${
              msg.senderId === authUser._id ? "justify-end" : "justify-start"
            }`}
          >
            {/* Avatar for others */}
            {msg.senderId !== authUser._id && (
              <div className="mr-2 text-center text-xs">
                <img
                  src={selectedUser?.profilePic || assets.avatar_icon}
                  alt="avatar"
                  className="w-7 rounded-full"
                />
                <p className="text-gray-500 text-[10px]">
                  {formatMessageTime(msg.createdAt)}
                </p>
              </div>
            )}

            {/* Message bubble */}
            <div className="flex flex-col max-w-[65%]">
              {msg.image ? (
                <img
                  src={msg.image}
                  alt="sent-img"
                  className={`max-w-[230px] rounded-lg border ${
                    msg.senderId === authUser._id
                      ? "border-blue-500/50"
                      : "border-gray-600/50"
                  }`}
                />
              ) : (
                <p
                  className={`px-3 py-2 md:text-sm rounded-lg break-words ${
                    msg.senderId === authUser._id
                      ? "bg-blue-500/70 text-white rounded-br-none"
                      : "bg-gray-300 text-black rounded-bl-none"
                  }`}
                >
                  {msg.text}
                </p>
              )}

              {/* Seen ticks */}
              {msg.senderId === authUser._id && (
                <span
                  className={`text-[10px] text-right mt-1 ${
                    msg.seen ? "text-blue-400" : "text-gray-400"
                  }`}
                >
                  {msg.seen ? "✓✓" : "✓"}
                </span>
              )}
            </div>

            {/* Avatar for self */}
            {msg.senderId === authUser._id && (
              <div className="ml-2 text-center text-xs">
                <img
                  src={authUser?.profilePic || assets.avatar_icon}
                  alt="me"
                  className="w-7 rounded-full"
                />
                <p className="text-gray-500 text-[10px]">
                  {formatMessageTime(msg.createdAt)}
                </p>
              </div>
            )}
          </div>
        ))}
        <div ref={scrollEnd}></div>
      </div>

      {/* Bottom Input */}
      <form
        onSubmit={handleSendMessage}
        className="absolute bottom-0 left-0 right-0 flex items-center gap-3 p-3 bg-gray-900/70"
      >
        <div className="flex-1 flex items-center bg-gray-100/10 px-3 rounded-full">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 text-sm p-3 bg-transparent border-none outline-none text-white placeholder-gray-400"
          />
          <input
            onChange={handleSendImage}
            type="file"
            id="image"
            accept="image/png,image/jpeg"
            hidden
          />
          <label htmlFor="image">
            <img
              src={assets.gallery_icon}
              alt="gallery"
              className="w-5 mr-2 cursor-pointer"
            />
          </label>
        </div>
        <button type="submit">
          <img src={assets.send_button} alt="send" />
        </button>
      </form>
    </div>
  ) : (
    <div className="flex flex-col items-center justify-center gap-2 text-gray-500 bg-white/10 max-md:hidden h-full">
      <img src={assets.logo_icon} className="w-16" alt="logo" />
      <p className="text-lg font-medium text-white">Chat Anytime, Anywhere</p>
    </div>
  );
};

export default ChatContainer;