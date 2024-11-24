const Notification = require("../models/Notification");
const User = require("../models/User");

exports.createNotification = async (userId, message, type) => {
  try {
    const notification = new Notification({
      user: userId,
      message,
      type,
    });
    await notification.save();
  } catch (err) {
    console.error("Error creating notification:", err);
  }
};

exports.notifyAdmins = async (message, type) => {
  try {
    const admins = await User.find({ isAdmin: true });
    for (const admin of admins) {
      await this.createNotification(admin._id, message, type);
    }
  } catch (err) {
    console.error("Error notifying admins:", err);
  }
};
