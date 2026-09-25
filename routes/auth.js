const express = require("express");
const router = express.Router();
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const verifyToken = require("../middleware/authMiddleware");

// 1. TOGGLE ORDERS OPEN/CLOSED
router.put("/toggle-orders", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found!",
      });
    }

    if (user.role !== "hotel_admin") {
      return res.status(403).json({
        message: "Only hotel admin can open or close orders!",
      });
    }

    user.isAcceptingOrders = !user.isAcceptingOrders;

    await user.save();

    res.status(200).json({
      message: `Orders are now ${
        user.isAcceptingOrders ? "OPEN 🟢" : "CLOSED 🔴"
      }`,
      isAcceptingOrders: user.isAcceptingOrders,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error updating order status",
      error: error.message,
    });
  }
});

// 2. REGISTER API
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, hotelId } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Name, email and password are required!",
      });
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({
        message: "User with this email already exists!",
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      role: "hotel_admin",
      hotelId: hotelId || null,
      isApproved: false,
      isAcceptingOrders: true,
    });

    await newUser.save();

    res.status(201).json({
      message:
        "Registration successful! Your account is pending approval from Super Admin. 🟢",
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error during registration",
      error: error.message,
    });
  }
});

// RESET HOTEL ADMIN PASSWORD BY SUPER ADMIN
router.put("/reset-password/:userId", verifyToken, verifySuperAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters long!" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { password: hashedPassword },
      { new: true }
    );

    if (!updatedUser) return res.status(404).json({ message: "Hotel Admin not found!" });

    res.status(200).json({ message: "Password reset successfully by Super Admin! 🟢" });
  } catch (error) {
    res.status(500).json({ message: "Error resetting password", error: error.message });
  }
});

// 3. LOGIN API
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({
        message: "Invalid email or password!",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({
        message: "Invalid email or password!",
      });
    }

    if (user.role !== "super_admin" && !user.isApproved) {
      return res.status(403).json({
        message:
          "Your account is pending approval from Super Admin!",
      });
    }

    if (user.accountStatus === "banned") {
      return res.status(403).json({
        message:
          "Your account has been banned by Super Admin!",
      });
    }

    const token = jwt.sign(
      {
        userId: user._id,
        role: user.role,
        hotelId: user.hotelId,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1d",
      }
    );

    res.status(200).json({
      message: "Login successful! 🚀",
      token,
      user: {
        name: user.name,
        email: user.email,
        role: user.role,
        hotelId: user.hotelId,
        isAcceptingOrders: user.isAcceptingOrders,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error during login",
      error: error.message,
    });
  }
});

module.exports = router;