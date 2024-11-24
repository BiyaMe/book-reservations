const express = require('express');
const router = express.Router();
const { createReservation, getReservations, getReservation, updateReservationStatus } = require('../controllers/reservationController');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');

router.post('/', auth, createReservation);
router.get('/', [auth, admin], getReservations);
router.get('/:id', auth, getReservation);
router.put('/:id', [auth, admin], updateReservationStatus);

module.exports = router;