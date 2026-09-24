// 1. Import Mongoose
const mongoose = require("mongoose");

// 2. Define the Hotel Schema (Tenant Structure)
const hotelSchema = new mongoose.Schema(
  {
    hotelId: {
      type: String,
      required: true,
      unique: true, // Every hotel must have a unique identifier (slug/code)
    },
    hotelName: {
      type: String,
      required: true, // Name of the hotel/restaurant
    },
    address: {
      type: String,
      default: "India",
    },
    totalTables: {
      type: Number,
      required: true, // Total number of tables for QR generation (e.g., 20 tables)
    },
    isActive: {
      type: Boolean,
      default: true, // If false, the hotel subscription expired or disabled
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt fields
  }
);

// 3. Export the Hotel model
module.exports = mongoose.model("Hotel", hotelSchema);