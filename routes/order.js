const express = require("express");
const router = express.Router();
const Order = require("../models/Order");
const User = require("../models/User");
const verifyToken = require("../middleware/authMiddleware");

// 1. PLACE ORDER API
router.post("/place", async (req, res) => {
  try {
    const { hotelId, tableNo, customerName, items, totalAmount } = req.body;

    if (!hotelId || !tableNo || !items || items.length === 0) {
      return res.status(400).json({
        message: "Please provide all required order details!",
      });
    }

    const hotelAdmin = await User.findOne({ hotelId });

    if (hotelAdmin && hotelAdmin.isAcceptingOrders === false) {
      return res.status(400).json({
        message:
          "Hotel is currently closed. We are not accepting orders right now! 🔴",
      });
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

    req.io.emit(`newOrder_${hotelId}`, {
      message: "New order received! 🔔",
      order: newOrder,
    });

    res.status(201).json({
      message: "Order placed successfully! 🚀",
      newOrder,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error placing order",
      error: error.message,
    });
  }
});

// 2. GET HOTEL ORDERS API
router.get("/hotel-orders", verifyToken, async (req, res) => {
  try {
    if (!req.user.hotelId) {
      return res.status(400).json({
        message: "User is not linked to any hotel!",
      });
    }

    const orders = await Order.find({
      hotelId: req.user.hotelId,
    }).sort({ createdAt: -1 });

    res.status(200).json(orders);
  } catch (error) {
    res.status(500).json({
      message: "Error fetching orders",
      error: error.message,
    });
  }
});

// 3. UPDATE ORDER STATUS API
router.put("/status/:orderId", verifyToken, async (req, res) => {
  try {
    const { status } = req.body;
    const { orderId } = req.params;

    const updatedOrder = await Order.findByIdAndUpdate(
      orderId,
      { status },
      { new: true }
    );

    if (!updatedOrder) {
      return res.status(404).json({
        message: "Order not found!",
      });
    }

    res.status(200).json({
      message: "Order status updated successfully! 🟢",
      updatedOrder,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error updating order status",
      error: error.message,
    });
  }
});

// 4. GENERATE BILL API
router.get("/bill/:tableNo", verifyToken, async (req, res) => {
  try {
    const { hotelId } = req.user;
    const { tableNo } = req.params;

    const orders = await Order.find({
      hotelId,
      tableNo,
      status: { $ne: "Paid" },
    });

    if (orders.length === 0) {
      return res.status(404).json({
        message: "No active orders found for this table!",
      });
    }

    const grandTotal = orders.reduce(
      (sum, order) => sum + order.totalAmount,
      0
    );

    res.status(200).json({
      tableNo,
      activeOrders: orders,
      grandTotal,
      message: "Bill summary generated successfully! 🧾",
    });
  } catch (error) {
    res.status(500).json({
      message: "Error generating bill",
      error: error.message,
    });
  }
});

// 5. CLOSE BILL / MARK AS PAID API
router.put("/pay/:tableNo", verifyToken, async (req, res) => {
  try {
    const { hotelId } = req.user;
    const { tableNo } = req.params;

    const result = await Order.updateMany(
      {
        hotelId,
        tableNo,
        status: { $ne: "Paid" },
      },
      {
        $set: { status: "Paid" },
      }
    );

    if (result.modifiedCount === 0) {
      return res.status(404).json({
        message: "No unpaid orders found for this table!",
      });
    }

    res.status(200).json({
      message: `Bill for table ${tableNo} marked as Paid and closed successfully! 💰`,
    });


  } catch (error) {
    res.status(500).json({
      message: "Error closing bill",
      error: error.message,
    });
    // GET HOTEL TRANSACTIONS & ANALYTICS (Super Admin only)
    router.get("/hotel-stats/:hotelId", verifyToken, verifySuperAdmin, async (req, res) => {
      try {
        const { hotelId } = req.params;

        // Import Order model (ensure you require it at the top of your file)
        const Order = require("../models/Order");

        // 1. Get Daily Transactions (Group by Date)
        const dailyStats = await Order.aggregate([
          { $match: { hotelId: hotelId } },
          {
            $group: {
              _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
              totalSales: { $sum: "$totalAmount" }, // Assuming 'totalAmount' stores the order price
              totalOrders: { $sum: 1 }
            }
          },
          { $sort: { _id: -1 } } // Latest date first
        ]);

        // 2. Get Monthly Transactions (Group by Year-Month)
        const monthlyStats = await Order.aggregate([
          { $match: { hotelId: hotelId } },
          {
            $group: {
              _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
              totalSales: { $sum: "$totalAmount" },
              totalOrders: { $sum: 1 }
            }
          },
          { $sort: { _id: -1 } } // Latest month first
        ]);

        res.status(200).json({
          hotelId,
          dailyStats,
          monthlyStats
        });
      } catch (error) {
        res.status(500).json({ message: "Error fetching hotel stats", error: error.message });
      }
    });
  }
});

module.exports = router;