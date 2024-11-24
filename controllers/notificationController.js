const Notification = require('../models/Notification');

exports.createNotification = async (userId, message, type) => {
  try {
    const notification = new Notification({
      user: userId,
      message,
      type,
    });
    await notification.save();
  } catch (err) {
    console.error('Error creating notification:', err);
  }
};

exports.getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json(notifications);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};