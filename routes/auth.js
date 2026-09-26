const express = require("express");
const router = express.Router();
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const verifyToken = require("../middleware/authMiddleware");

// Middleware to check if logged-in user is Super Admin
const verifySuperAdmin = (req, res, next) => {
  if (req.user && req.user.role === "super_admin") {
    next();
  } else {
    res.status(403).json({ message: "Access Denied! Super Admin only." });
  }
};

// 1. TOGGLE ORDERS OPEN/CLOSED
router.put("/toggle-orders", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({ message: "User not found!" });
    }

    if (user.role !== "hotel_admin") {
      return res.status(403).json({ message: "Only hotel admin can open or close orders!" });
    }

    user.isAcceptingOrders = !user.isAcceptingOrders;
    await user.save();

    res.status(200).json({
      message: `Orders are now ${user.isAcceptingOrders ? "OPEN 🟢" : "CLOSED 🔴"}`,
      isAcceptingOrders: user.isAcceptingOrders,
    });
  } catch (error) {
    res.status(500).json({ message: "Error updating order status", error: error.message });
  }
});

// 2. REGISTER API
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, hotelId } = req.body;

    // 1. Check if all fields including hotelId are provided
    if (!name || !email || !password || !hotelId) {
      return res.status(400).json({ message: "Name, email, password and Hotel ID are all required!" });
    }

    // 2. Clean and standardize hotelId (lowercase and trim spaces)
    const formattedHotelId = hotelId.trim().toLowerCase();

    // 3. Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User with this email already exists!" });
    }

    // 4. NEW: Check if hotelId is already taken by another hotel
    const existingHotel = await User.findOne({ hotelId: formattedHotelId });
    if (existingHotel) {
      return res.status(400).json({
        message: `Hotel ID '${hotelId}' is already registered! Please choose a unique Hotel ID.`
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      role: "hotel_admin",
      hotelId: formattedHotelId, // Saved as unique standardized string
      isApproved: false,
      isAcceptingOrders: true,
    });

    await newUser.save();

    res.status(201).json({
      message: "Registration successful! Your account is pending approval from Super Admin. 🟢",
    });
  } catch (error) {
    res.status(500).json({ message: "Server error during registration", error: error.message });
  }
});

// 3. LOGIN API
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

    if (user.role !== "super_admin" && !user.isApproved) {
      return res.status(403).json({ message: "Your account is pending approval from Super Admin!" });
    }

    if (user.accountStatus === "banned") {
      return res.status(403).json({ message: "Your account has been banned by Super Admin!" });
    }

    const token = jwt.sign(
      {
        userId: user._id,
        role: user.role,
        hotelId: user.hotelId,
      },
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
    isAcceptingOrders: user.isAcceptingOrders,
    totalTables: user.totalTables || 5, // 👈 Yeh line add karni hai
  },
});




  } catch (error) {
    res.status(500).json({ message: "Server error during login", error: error.message });
  }
});

// 4. RESET HOTEL ADMIN PASSWORD BY SUPER ADMIN
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

// 5. FORGOT PASSWORD API (Hotel Admin can reset their own password)
router.post("/forgot-password", async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    if (!email || !newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: "Email and new password (min 6 chars) are required!" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User with this email does not exist!" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    user.password = hashedPassword;
    await user.save();

    res.status(200).json({ message: "Password updated successfully! You can now login. 🚀" });
  } catch (error) {
    res.status(500).json({ message: "Server error during password reset", error: error.message });
  }
});

// 6. UPDATE HOTEL TABLES COUNT API
router.put("/update-tables", verifyToken, async (req, res) => {
  try {
    const { totalTables } = req.body;

    if (!totalTables || totalTables < 1) {
      return res.status(400).json({ message: "Invalid table count!" });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user.userId,
      { totalTables },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "Hotel Admin not found!" });
    }

    res.status(200).json({
      message: "Total tables updated successfully! 🟢",
      totalTables: updatedUser.totalTables,
    });
  } catch (error) {
    res.status(500).json({ message: "Error updating tables", error: error.message });
  }
});

module.exports = router;