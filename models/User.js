const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
    },

    password: {
      type: String,
      required: true,
    },

    role: {
      type: String,
      enum: ["super_admin", "hotel_admin"],
      default: "hotel_admin",
    },

    hotelId: {
      type: String,
      default: null,
    },

    isApproved: {
      type: Boolean,
      default: false,
    },

    isAcceptingOrders: {
      type: Boolean,
      default: true,
    },

    accountStatus: {
      type: String,
      enum: ["active", "banned"],
      default: "active",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("User", userSchema);