const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const config = require("../config/database");
const { notifyAdmins } = require("../utils/notificationUtils");

exports.register = async (req, res) => {
  try {
    const { name, email, phoneNumber, password } = req.body;
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: "User already exists" });
    }
    user = new User({ name, email, phoneNumber, password, isApproved: false });
    await user.save();

    // Notify admins about new user registration
    await notifyAdmins(`New user registered: ${user.name}`, "new_user");

    const payload = { user: { id: user.id } };
    jwt.sign(payload, config.secret, { expiresIn: "1h" }, (err, token) => {
      if (err) throw err;
      res.json({ token, userId: user.id });
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    let user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }
    if (!user.isApproved) {
      return res
        .status(403)
        .json({ message: "Your account is pending approval" });
    }
    const payload = {
      user: {
        id: user.id,
        isAdmin: user.isAdmin,
      },
    };
    jwt.sign(payload, config.secret, { expiresIn: "1h" }, (err, token) => {
      if (err) throw err;
      res.json({ token, isAdmin: user.isAdmin });
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
};
