// 1. Import Mongoose
const mongoose = require("mongoose");

// 2. Define the Order Schema

const orderSchema = new mongoose.Schema(
  {
    hotelId: {
      type: String,
      required: true, // Which hotel received this order
    },
    tableNo: {
      type: Number,
      required: true, // Which table placed the order (e.g., Table 4)
    },
    customerName: {
      type: String,
      default: "Guest", // Optional name provided by the customer
    },
    items: [
      {
        menuItemId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "MenuItem",
        },
        name: String,
        price: Number,
        quantity: Number,
      },
    ],
    totalAmount: {
      type: Number,
      required: true, // Total bill amount
    },
    status: {
      type: String,
      enum: ["New", "Preparing", "Delivered", "Cancelled"],
      default: "New", // Initial state when order is placed
    },
  },
  {
    timestamps: true, // Automatically tracks when the order was placed
  }
);

// 3. Export the model
module.exports = mongoose.model("Order", orderSchema);