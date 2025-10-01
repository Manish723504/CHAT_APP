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

  // Fetch all users
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

  // Fetch messages
  const getMessages = async (userId) => {
    if (!userId) return;
    try {
      const { data } = await axios.get(`/api/messages/${userId}`);
      if (data.success) {
        setMessages(data.messages);

        // Reset unseen counter for this user (delete instead of 0)
        setUnseenMessages((prev) => {
          const updated = { ...prev };
          delete updated[userId];
          return updated;
        });

        // Mark unseen msgs as seen
        const unseenIds = data.messages
          .filter((msg) => msg.senderId === userId && !msg.seen)
          .map((msg) => msg._id);

        if (unseenIds.length > 0) {
          socket?.emit("markSeen", unseenIds);
          markSeen(unseenIds);
          await axios.put("/api/messages/mark", { ids: unseenIds });
        }
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  // Send message
  const sendMessage = async (messageData) => {
    if (!selectedUser) return;
    try {
      const { data } = await axios.post(
        `/api/messages/send/${selectedUser._id}`,
        messageData
      );

      if (data.success) {
        setMessages((prev) => [...prev, data.newMessage]);
        socket?.emit("sendMessage", data.newMessage);
      } else toast.error(data.message);
    } catch (error) {
      toast.error(error.message);
    }
  };

  // Mark msgs seen locally
  const markSeen = (ids) => {
    if (!ids?.length) return;
    setMessages((prev) =>
      prev.map((msg) =>
        ids.includes(msg._id) ? { ...msg, seen: true } : msg
      )
    );

    if (selectedUser) {
      setUnseenMessages((prev) => {
        const updated = { ...prev };
        delete updated[selectedUser._id];
        return updated;
      });
    }
  };

  // Handle user select
  const handleSelectUser = async (user) => {
    if (!user) return;
    setSelectedUser(user);

    // Reset counter when user opens chat
    setUnseenMessages((prev) => {
      const updated = { ...prev };
      delete updated[user._id];
      return updated;
    });

    await getMessages(user._id);
  };

  // Subscribe to socket events
  const subscribeToMessages = () => {
    if (!socket) return () => {};

    const handleNewMessage = async (msg) => {
      // Agar selected user same hai → direct seen
      if (selectedUser && msg.senderId === selectedUser._id) {
        setMessages((prev) => [...prev, { ...msg, seen: true }]);
        markSeen([msg._id]);
        socket.emit("markSeen", [msg._id]);
        await axios.put("/api/messages/mark", { ids: [msg._id] });

        // remove unseen counter
        setUnseenMessages((prev) => {
          const updated = { ...prev };
          delete updated[msg.senderId];
          return updated;
        });
      }
      // Agar message current user ke liye hai aur chat open nahi hai → unseen +1
      else if (msg.receiverId === authUser._id) {
        setUnseenMessages((prev) => ({
          ...prev,
          [msg.senderId]: (prev[msg.senderId] || 0) + 1,
        }));
      }
    };

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
    setSelectedUser,
    handleSelectUser,
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
