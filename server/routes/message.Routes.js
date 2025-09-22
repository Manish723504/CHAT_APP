import express from "express";
import { protectRoute } from "../middlewere/auth.js";
import {
  getMessages,
  getUsersForSlidebar,
  markMessageAsSeen,
  sendMessage
} from "../controllers/mesaageController.js";

const messageRouter = express.Router();

messageRouter.get("/users", protectRoute, getUsersForSlidebar);
messageRouter.get("/:id", protectRoute, getMessages);
messageRouter.put("/mark", protectRoute, markMessageAsSeen); // notice: /mark
messageRouter.post("/send/:id", protectRoute, sendMessage);

export default messageRouter;
