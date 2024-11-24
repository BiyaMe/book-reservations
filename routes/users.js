const express = require("express");
const router = express.Router();
const {
  getUser,
  updateUser,
  approveUser,
  getAllUsers,
} = require("../controllers/userController");
const auth = require("../middleware/auth");
const admin = require("../middleware/admin");

// Get all users (admin only)
router.get("/", [auth, admin], getAllUsers);

// Get user by ID
router.get("/:id", auth, getUser);

// Update user
router.put("/:id", auth, updateUser);

// Approve user (admin only)
router.put("/:id/approve", [auth, admin], approveUser);

module.exports = router;
