import { createContext, useContext, useEffect, useState } from "react";
import { AuthContext } from "./AuthContext";
import toast from "react-hot-toast";

export const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [unseenMessages, setUnseenMessages] = useState({});

  const { socket, axios, authUser } = useContext(AuthContext);

  // ✅ Fetch all users for sidebar
  const getUsers = async () => {
    try {
      const { data } = await axios.get("/api/messages/users");
      if (data.success) {
        setUsers(data.users || []);
        setUnseenMessages(data.unseenMessages || {});
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  // ✅ Fetch messages for selected user
  const getMessages = async (userId) => {
    try {
      const { data } = await axios.get(`/api/messages/${userId}`);
      if (data.success) {
        setMessages(data.messages);

        // Reset unseen counter
        setUnseenMessages((prev) => ({ ...prev, [userId]: 0 }));

        // Find unseen msgs
        const unseenIds = data.messages
          .filter((msg) => msg.senderId === userId && !msg.seen)
          .map((msg) => msg._id);

        if (unseenIds.length > 0) {
          socket.emit("markSeen", unseenIds);
          markSeen(unseenIds);
          await axios.put("/api/messages/mark", { ids: unseenIds });
        }
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  // ✅ Send a message
  const sendMessage = async (messageData) => {
    if (!selectedUser) return;
    try {
      const { data } = await axios.post(
        `/api/messages/send/${selectedUser._id}`,
        messageData
      );

      if (data.success) {
        setMessages((prev) => [...prev, data.newMessage]);
        socket.emit("sendMessage", data.newMessage);
      } else toast.error(data.message);
    } catch (error) {
      toast.error(error.message);
    }
  };

  // ✅ Mark messages seen locally
  const markSeen = (ids) => {
    setMessages((prev) =>
      prev.map((msg) =>
        ids.includes(msg._id) ? { ...msg, seen: true } : msg
      )
    );

    if (selectedUser) {
      setUnseenMessages((prev) => ({ ...prev, [selectedUser._id]: 0 }));
    }
  };

  // ✅ Handle user selection (safe select)
  const handleSelectUser = async (user) => {
    setSelectedUser(user);
    setUnseenMessages((prev) => ({ ...prev, [user._id]: 0 }));
    await getMessages(user._id);
  };

  // ✅ Subscribe to socket events
  const subscribeToMessages = () => {
    if (!socket) return;

    // New message listener
    const handleNewMessage = async (msg) => {
      setMessages((prev) => [...prev, msg]);

      if (selectedUser && msg.senderId === selectedUser._id) {
        msg.seen = true;
        markSeen([msg._id]);
        socket.emit("markSeen", [msg._id]);
        await axios.put("/api/messages/mark", { ids: [msg._id] });
      } else if (msg.receiverId === authUser._id) {
        setUnseenMessages((prev) => ({
          ...prev,
          [msg.senderId]: (prev[msg.senderId] || 0) + 1,
        }));
      }
    };

    // Seen message listener
    const handleSeen = (seenIds) => {
      markSeen(seenIds);
    };

    socket.on("newMessage", handleNewMessage);
    socket.on("messagesSeen", handleSeen);

    return () => {
      socket.off("newMessage", handleNewMessage);
      socket.off("messagesSeen", handleSeen);
    };
  };

  useEffect(() => {
    const cleanup = subscribeToMessages();
    return cleanup;
  }, [socket, selectedUser]);

  const value = {
    messages,
    users,
    selectedUser,
    setSelectedUser,   // 🔹 direct expose (null karne ke liye)
    handleSelectUser,  // 🔹 user select ke liye safe function
    getUsers,
    getMessages,
    sendMessage,
    unseenMessages,
    setUnseenMessages,
    markSeen,
  };

  return (
    <ChatContext.Provider value={value}>{children}</ChatContext.Provider>
  );
};
