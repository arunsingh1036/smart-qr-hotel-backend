const express = require("express");
const router = express.Router();
const MenuItem = require("../models/MenuItem");
const verifyToken = require("../middleware/authMiddleware");

// 1. GET MENU API (Public: Customers can view menu by hotelId)
router.get("/:hotelId", async (req, res) => {
  try {
    const { hotelId } = req.params;
    const menuItems = await MenuItem.find({ hotelId });
    res.status(200).json(menuItems);
  } catch (error) {
    res.status(500).json({ message: "Error fetching menu", error: error.message });
  }
});

// 2. ADD MENU ITEM API (Protected: Only Hotel Admin can add dishes)
router.post("/add", verifyToken, async (req, res) => {
  try {
    const { name, description, price, category, image } = req.body;

    // Ensure admin has a hotelId
    if (!req.user.hotelId) {
      return res.status(400).json({ message: "Admin is not linked to any hotel!" });
    }

    if (!name || !price) {
      return res.status(400).json({ message: "Name and price are required!" });
    }

    const newItem = new MenuItem({
      hotelId: req.user.hotelId,
      name,
      description,
      price,
      category: category || "Main Course",
      image: image || "",
    });

    await newItem.save();
    res.status(201).json({ message: "Menu item added successfully! 🍲", newItem });
  } catch (error) {
    res.status(500).json({ message: "Error adding menu item", error: error.message });
  }
});

// 3. DELETE MENU ITEM API (Protected: Only Hotel Admin can delete dishes)
router.delete("/delete/:itemId", verifyToken, async (req, res) => {
  try {
    const { itemId } = req.params;

    const deletedItem = await MenuItem.findByIdAndDelete(itemId);
    if (!deletedItem) {
      return res.status(404).json({ message: "Menu item not found!" });
    }

    res.status(200).json({ message: "Menu item deleted successfully! 🗑️" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting menu item", error: error.message });
  }
});

// 4. UPDATE MENU ITEM API (Protected: Only Hotel Admin can update dishes)
router.put("/update/:itemId", verifyToken, async (req, res) => {
  try {
    const { itemId } = req.params;
    const { name, description, price, category, image } = req.body;

    const updatedItem = await MenuItem.findByIdAndUpdate(
      itemId,
      { name, description, price, category, image },
      { new: true }
    );

    if (!updatedItem) {
      return res.status(404).json({ message: "Menu item not found!" });
    }

    res.status(200).json({ 
      message: "Menu item updated successfully! ✏️", 
      updatedItem 
    });
  } catch (error) {
    res.status(500).json({ 
      message: "Error updating menu item", 
      error: error.message 
    });
  }
});

module.exports = router;