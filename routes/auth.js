const express = require("express");
const router = express.Router();
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// 1. REGISTER API (Secured - Role is locked to hotel_admin and unapproved by default)
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, hotelId } = req.body;

    // Check if user already exists
    let existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User with this email already exists!" });
    }

    // Hash the password for security
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new user (Role is strictly forced to "hotel_admin" and approval is false)
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      role: "hotel_admin", // User apna role khud badal nahi sakta
      hotelId: hotelId || null,
      isApproved: false,    // By default unapproved rahega jab tak Super Admin approve na kare
    });

    await newUser.save();
    res.status(201).json({ 
      message: "Registration successful! Your account is pending approval from Super Admin. 🟢" 
    });
  } catch (error) {
    res.status(500).json({ message: "Server error during registration", error: error.message });
  }
});

// 2. LOGIN API (With Approval & Ban Check)
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid email or password!" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password!" });
    }

    // Check if account is approved by Super Admin (Super admin apne aap approved rahega)
    if (user.role !== "super_admin" && !user.isApproved) {
      return res.status(403).json({ message: "Your account is pending approval from Super Admin!" });
    }

    // Check if account is banned
    if (user.accountStatus === "banned") {
      return res.status(403).json({ message: "Your account has been banned by Super Admin!" });
    }

    const token = jwt.sign(
      { userId: user._id, role: user.role, hotelId: user.hotelId },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.status(200).json({
      message: "Login successful! 🚀",
      token,
      user: {
        name: user.name,
        email: user.email,
        role: user.role,
        hotelId: user.hotelId,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error during login", error: error.message });
  }
});

module.exports = router;