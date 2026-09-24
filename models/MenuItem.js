// 1. Import Mongoose
const mongoose = require("mongoose");

// 2. Define the MenuItem Schema
const menuItemSchema = new mongoose.Schema(
  {
    hotelId: {
      type: String,
      required: true, // Links the dish to a specific hotel
    },
    name: {
      type: String,
      required: true, // Name of the dish (e.g., Paneer Tikka)
    },
    price: {
      type: Number,
      required: true, // Price of the dish
    },
    category: {
      type: String,
      required: true, // Category (e.g., Starters, Main Course, Drinks)
    },
    isVeg: {
      type: Boolean,
      default: true, // True for Veg, False for Non-Veg
    },
    isAvailable: {
      type: Boolean,
      default: true, // If false, the dish is out of stock
    },
  },
  {
    timestamps: true,
  }
);

// 3. Export the model
module.exports = mongoose.model("MenuItem", menuItemSchema);