const express = require("express");
const router = express.Router();
const Order = require("../models/Order");
const verifyToken = require("../middleware/authMiddleware");

// 1. PLACE ORDER API (Public: Customers can place an order from their table without login)
// 1. PLACE ORDER API (Public: Customers can place an order)
router.post("/place", async (req, res) => {
  try {
    const { hotelId, tableNo, customerName, items, totalAmount } = req.body;

    if (!hotelId || !tableNo || !items || items.length === 0) {
      return res.status(400).json({ message: "Please provide all required order details!" });
    }

    const newOrder = new Order({
      hotelId,
      tableNo,
      customerName: customerName || "Guest",
      items,
      totalAmount,
      status: "New",
    });

    await newOrder.save();

    // ---> REAL-TIME SOCKET EMIT <---
    // Jaise hi naya order aaye, us hotel ke room/channel par event emit kar do
    req.io.emit(`newOrder_${hotelId}`, {
      message: "New order received! 🔔",
      order: newOrder,
    });

    res.status(201).json({ message: "Order placed successfully! 🚀", newOrder });
  } catch (error) {
    res.status(500).json({ message: "Error placing order", error: error.message });
  }
});

// 2. GET HOTEL ORDERS API (Protected: Only logged-in Hotel Admin/Staff can view live orders)
router.get("/hotel-orders", verifyToken, async (req, res) => {
  try {
    // Ensure user has a hotelId
    if (!req.user.hotelId) {
      return res.status(400).json({ message: "User is not linked to any hotel!" });
    }

    // Fetch all orders for this hotel, latest orders first
    const orders = await Order.find({ hotelId: req.user.hotelId }).sort({ createdAt: -1 });

    res.status(200).json(orders);
  } catch (error) {
    res.status(500).json({ message: "Error fetching orders", error: error.message });
  }
});

// 3. UPDATE ORDER STATUS API (Protected: Kitchen staff can change status to Preparing/Delivered)
router.put("/status/:orderId", verifyToken, async (req, res) => {
  try {
    const { status } = req.body; // e.g., "Preparing", "Delivered", "Cancelled"
    const { orderId } = req.params;

    const updatedOrder = await Order.findByIdAndUpdate(
      orderId,
      { status },
      { new: true } // Returns the updated document
    );

    if (!updatedOrder) {
      return res.status(404).json({ message: "Order not found!" });
    }

    res.status(200).json({ message: "Order status updated successfully! 🟢", updatedOrder });
  } catch (error) {
    res.status(500).json({ message: "Error updating order status", error: error.message });
  }
});

// 4. GENERATE BILL API (Protected: Fetch total bill for a specific table)
router.get("/bill/:tableNo", verifyToken, async (req, res) => {
  try {
    const { hotelId } = req.user;
    const { tableNo } = req.params;

    // Find all orders for this table that are not yet paid/closed
    const orders = await Order.find({ hotelId, tableNo, status: { $ne: "Paid" } });

    if (orders.length === 0) {
      return res.status(404).json({ message: "No active orders found for this table!" });
    }

    // Calculate grand total amount
    const grandTotal = orders.reduce((sum, order) => sum + order.totalAmount, 0);

    res.status(200).json({
      tableNo,
      activeOrders: orders,
      grandTotal,
      message: "Bill summary generated successfully! 🧾",
    });
  } catch (error) {
    res.status(500).json({ message: "Error generating bill", error: error.message });
  }
});

// 5. CLOSE BILL / MARK AS PAID API (Protected: Mark table orders as Paid)
router.put("/pay/:tableNo", verifyToken, async (req, res) => {
  try {
    const { hotelId } = req.user;
    const { tableNo } = req.params;

    // Update all active orders of this table to "Paid"
    const result = await Order.updateMany(
      { hotelId, tableNo, status: { $ne: "Paid" } },
      { $set: { status: "Paid" } }
    );

    if (result.modifiedCount === 0) {
      return res.status(404).json({ message: "No unpaid orders found for this table!" });
    }

    res.status(200).json({ message: `Bill for table ${tableNo} marked as Paid and closed successfully! 💰` });
  } catch (error) {
    res.status(500).json({ message: "Error closing bill", error: error.message });
  }
});

module.exports = router;