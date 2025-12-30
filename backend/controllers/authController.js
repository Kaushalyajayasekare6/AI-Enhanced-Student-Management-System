import User from "../models/User.js";
import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET || "fallback-secret-key-change-in-production";

// 🔹 Helper: Generate JWT
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, username: user.username, role: user.role },
    SECRET,
    { expiresIn: "7d" }
  );
};

// 🔹 Register user programmatically
export const registerUser = async (username, password, role, userId) => {
  const existing = await User.findOne({ username });
  if (existing) throw new Error("Username already exists");
  const user = new User({ username, password, role, userId });
  await user.save();
  return user;
};

// 🔹 Login user
export const loginUser = async (req, res) => {
  try {
    const { username, password, role } = req.body;

    const user = await User.findOne({ username, role });
    if (!user) return res.status(400).json({ error: "Invalid username or role" });

    const isMatch = await user.matchPassword(password);
    if (!isMatch) return res.status(400).json({ error: "Invalid password" });

    const token = generateToken(user);
    res.json({ token, role: user.role });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 🔹 Get current user
export const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
