import { createContext, useEffect, useState } from "react";
import { Analytics } from '@vercel/analytics/next';
import axios from "axios";
import toast from "react-hot-toast";
import { io } from "socket.io-client";

const backendUrl = import.meta.env.VITE_BACKEND_URL;
axios.defaults.baseURL = backendUrl;

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [authUser, setAuthUser] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [socket, setSocket] = useState(null);

  // Axios interceptor -> only once
  useEffect(() => {
    const interceptor = axios.interceptors.request.use((config) => {
      const token = localStorage.getItem("token");
      if (token) config.headers.Authorization = `Bearer ${token}`;
      return config;
    });
    return () => axios.interceptors.request.eject(interceptor);
  }, []);

  // Check Auth
  const checkAuth = async () => {
    try {
      const { data } = await axios.get("/api/auth/check");
      if (data.success) {
        setAuthUser(data.user);
        connectSocket(data.user);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  // Login
  const login = async (state, credentials) => {
    try {
      
      const { data } = await axios.post(`/api/auth/${state}`, credentials);
      if (data.success) {
        setAuthUser(data.userData);
        setToken(data.token);
        localStorage.setItem("token", data.token);
        connectSocket(data.userData);
        toast.success(data.message);
      } else toast.error(data.message);
    } catch (error) {
      toast.error(error.message);
    }
  };

  // Logout
  const logout = async () => {
    localStorage.removeItem("token");
    setToken(null);
    setAuthUser(null);
    setOnlineUsers([]);
    if (socket) {
      socket.disconnect();
      setSocket(null);
    }
    toast.success("Logged out Successfully");
  };

  // Update Profile
  const updateProfile = async (body) => {
    try {
      const { data } = await axios.put("/api/auth/update-profile", body);
      if (data.success) {
        setAuthUser(data.user);
        toast.success("Profile Updated");
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  // Connect Socket
  const connectSocket = (userData) => {
    if (!userData) return;

    // Disconnect old socket if exists
    if (socket) {
      socket.disconnect();
    }

    const newSocket = io(backendUrl, {
      auth: { token: localStorage.getItem("token") },
    });

    newSocket.on("connect", () => {
      console.log("Socket connected:", newSocket.id);
    });

    newSocket.on("getOnlineUsers", (userIDs) => {
      setOnlineUsers(userIDs);
    });

    // Direct socket usage for ChatContext
    newSocket.on("newMessage", (msg) => {
      // Can be handled directly in ChatContext
    });

    newSocket.on("messagesSeen", (msgIds) => {
      // Can be handled directly in ChatContext
    });

    setSocket(newSocket);
  };

  // Auto-check auth on load
  useEffect(() => {
    if (token) checkAuth();

    return () => {
      if (socket) socket.disconnect();
    };
  }, [token]);

  const value = {
    axios,
    authUser,
    onlineUsers,
    socket,
    login,
    logout,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}<Analytics /></AuthContext.Provider>;
};
