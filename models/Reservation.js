const mongoose = require('mongoose');

const ReservationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  book: { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date },
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'completed'], default: 'pending' }
});

module.exports = mongoose.model('Reservation', ReservationSchema);