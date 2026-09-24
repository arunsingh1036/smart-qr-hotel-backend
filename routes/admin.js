const express = require("express");
const router = express.Router();
const User = require("../models/User");
const verifyToken = require("../middleware/authMiddleware");

// Middleware to check if logged-in user is Super Admin
const verifySuperAdmin = (req, res, next) => {
  if (req.user && req.user.role === "super_admin") {
    next();
  } else {
    res.status(403).json({ message: "Access Denied! Super Admin only." });
  }
};

// 1. APPROVE HOTEL ADMIN API (Super Admin approves a registered hotel)
router.put("/approve/:userId", verifyToken, verifySuperAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { isApproved: true },
      { new: true }
    );
    if (!updatedUser) return res.status(404).json({ message: "User not found!" });

    res.status(200).json({ message: "Hotel Admin approved successfully! 🟢", updatedUser });
  } catch (error) {
    res.status(500).json({ message: "Error approving user", error: error.message });
  }
});

// 2. BAN / UNBAN HOTEL ADMIN API (Super Admin can block or unblock)
router.put("/status/:userId", verifyToken, verifySuperAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { accountStatus } = req.body; // "active" ya "banned"

    if (!["active", "banned"].includes(accountStatus)) {
      return res.status(400).json({ message: "Invalid status! Use 'active' or 'banned'." });
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { accountStatus },
      { new: true }
    );
    if (!updatedUser) return res.status(404).json({ message: "User not found!" });

    res.status(200).json({ message: `Account status updated to ${accountStatus} successfully!`, updatedUser });
  } catch (error) {
    res.status(500).json({ message: "Error updating account status", error: error.message });
  }
});

// 3. DELETE HOTEL ADMIN API (Permanent remove)
router.delete("/user/:userId", verifyToken, verifySuperAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const deletedUser = await User.findByIdAndDelete(userId);
    if (!deletedUser) return res.status(404).json({ message: "User not found!" });

    res.status(200).json({ message: "Hotel Admin deleted permanently! ❌" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting user", error: error.message });
  }
});
// GENERATE TABLE QR LINK API (Protected: Hotel Admin can generate ordering links for tables)
router.get("/qr-link/:tableNo", verifyToken, async (req, res) => {
  try {
    const { hotelId } = req.user;
    const { tableNo } = req.params;

    if (!hotelId) {
      return res.status(400).json({ message: "Admin is not linked to any hotel!" });
    }

    // Frontend par customer ordering page ka URL format banate hain
    // Aap apne frontend URL (jaise React/Next.js) ke hisab se ise badal sakte hain
    const orderingUrl = `https://your-hotel-frontend.com/order?hotelId=${hotelId}&table=${tableNo}`;

    res.status(200).json({
      hotelId,
      tableNo,
      orderingUrl,
      message: `QR ordering link generated successfully for Table ${tableNo}! 📱`,
    });
  } catch (error) {
    res.status(500).json({ message: "Error generating QR link", error: error.message });
  }
});

module.exports = router;