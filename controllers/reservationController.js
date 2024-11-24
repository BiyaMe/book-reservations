const Reservation = require("../models/Reservation");
const Book = require("../models/Book");
const {
  createNotification,
  notifyAdmins,
} = require("../utils/notificationUtils");

exports.createReservation = async (req, res) => {
  try {
    const { bookId, startDate, endDate } = req.body;
    const book = await Book.findById(bookId);
    if (!book) {
      return res.status(404).json({ message: "Book not found" });
    }
    const newReservation = new Reservation({
      user: req.user.id,
      book: bookId,
      startDate,
      endDate,
      status: "pending",
    });
    const reservation = await newReservation.save();

    // Notify admins about new reservation request
    await notifyAdmins(
      `New reservation request from ${req.user.name} for "${book.title}"`,
      "new_reservation"
    );

    res.json(reservation);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};

exports.updateReservationStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const reservation = await Reservation.findById(req.params.id).populate(
      "book",
      "title"
    );
    if (!reservation) {
      return res.status(404).json({ message: "Reservation not found" });
    }

    reservation.status = status;
    await reservation.save();

    // Notify user about reservation status change
    await createNotification(
      reservation.user,
      `Your reservation for "${reservation.book.title}" has been ${status}`,
      "reservation_status"
    );

    res.json(reservation);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};

exports.getReservations = async (req, res) => {
  try {
    const reservations = await Reservation.find()
      .populate("user", "name")
      .populate("book", "title");
    res.json(reservations);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};

exports.getReservation = async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id)
      .populate("user", "name")
      .populate("book", "title");
    if (!reservation) {
      return res.status(404).json({ message: "Reservation not found" });
    }
    if (reservation.user._id.toString() !== req.user.id && !req.user.isAdmin) {
      return res
        .status(403)
        .json({ message: "Not authorized to view this reservation" });
    }
    res.json(reservation);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};
