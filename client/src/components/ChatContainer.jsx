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
    unseenMessages,
    setUnseenMessages,
  } = useContext(ChatContext);

  const { authUser, onlineUsers, socket } = useContext(AuthContext);

  const scrollEnd = useRef();
  const [input, setInput] = useState("");

  // send text
  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if (input.trim() === "") return;
    await sendMessage({ text: input.trim() });
    setInput("");
  };

  // send image
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

  // fetch messages when user selected
  useEffect(() => {
    if (selectedUser) {
      getMessages(selectedUser._id);

      // Reset unseen count for this user when chat opens
      setUnseenMessages((prev) => ({ ...prev, [selectedUser._id]: 0 }));
    }
  }, [selectedUser]);

  // auto scroll
  useEffect(() => {
    if (scrollEnd.current && messages.length > 0) {
      scrollEnd.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // mark seen when new messages arrive
  useEffect(() => {
    if (!selectedUser || !socket) return;

    const unseenMsgIds = messages
      .filter((m) => m.senderId === selectedUser._id && !m.seen)
      .map((m) => m._id);

    if (unseenMsgIds.length > 0) {
      socket.emit("markSeen", unseenMsgIds);
      markSeen(unseenMsgIds);
    }

    // Listen for seen updates from backend
    socket.on("messagesSeen", (seenMessageIds) => {
      markSeen(seenMessageIds);
    });

    return () => {
      socket.off("messagesSeen");
    };
  }, [messages, selectedUser, socket]);

  return selectedUser ? (
    <div className="h-full overflow-hidden relative backdrop-blur-lg">
      {/* header */}
      <div className="flex items-center gap-3 py-3 mx-4 border-b border-stone-500">
        <img
          src={selectedUser.profilePic || assets.avatar_icon}
          alt=""
          className="w-8 rounded-full"
        />
        <p className="flex-1 text-lg text-white flex items-center gap-2">
          {selectedUser.fullName}
          {onlineUsers.includes(selectedUser._id) && (
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
          )}
        </p>
        <img
          onClick={() => setSelectedUser(null)}
          src={assets.arrow_icon}
          alt=""
          className="md:hidden w-7 cursor-pointer"
        />
        <img
          src={assets.help_icon}
          alt=""
          className="max-md:hidden w-5 cursor-pointer"
        />
      </div>

      {/* chat area */}
      <div className="flex flex-col h-[calc(100%-120px)] overflow-y-scroll p-3 pb-6">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex items-end mb-8 ${
              msg.senderId === authUser._id ? "justify-end" : "justify-start"
            }`}
          >
            {/* Avatar for others */}
            {msg.senderId !== authUser._id && (
              <div className="mr-2 text-center text-xs">
                <img
                  src={selectedUser?.profilePic || assets.avatar_icon}
                  alt=""
                  className="w-7 rounded-full"
                />
                <p className="text-gray-500 text-[10px]">
                  {formatMessageTime(msg.createdAt)}
                </p>
              </div>
            )}

            {/* Message bubble */}
            <div className="flex flex-col">
              {msg.image ? (
                <img
                  src={msg.image}
                  alt=""
                  className={`max-w-[230px] border rounded-lg overflow-hidden ${
                    msg.senderId === authUser._id
                      ? "border-blue-500/50"
                      : "border-gray-600/50"
                  }`}
                />
              ) : (
                <p
                  className={`p-2 max-w-[200px] md:text-sm font-light rounded-lg break-words ${
                    msg.senderId === authUser._id
                      ? "bg-blue-500/60 text-white rounded-br-none"
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
                  alt=""
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

      {/* bottom input */}
      <div className="absolute bottom-0 left-0 right-0 flex items-center gap-3 p-3">
        <div className="flex-1 flex items-center bg-gray-100/12 px-3 rounded-full">
          <input
            onChange={(e) => setInput(e.target.value)}
            value={input}
            onKeyDown={(e) => (e.key === "Enter" ? handleSendMessage(e) : null)}
            type="text"
            placeholder="Send a message"
            className="flex-1 text-sm p-3 border-none rounded-lg outline-none text-white placeholder-gray-400"
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
              alt=""
              className="w-5 mr-2 cursor-pointer"
            />
          </label>
        </div>
        <img onClick={handleSendMessage} src={assets.send_button} alt="" />
      </div>
    </div>
  ) : (
    <div className="flex flex-col items-center justify-center gap-2 text-gray-500 bg-white/10 max-md:hidden h-full">
      <img src={assets.logo_icon} className="w-16" alt="" />
      <p className="text-lg font-medium text-white">Chat Anytime, Anywhere</p>
    </div>
  );
};

export default ChatContainer;
