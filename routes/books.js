const express = require('express');
const router = express.Router();
const { getBooks, getBook, addBook, updateBook } = require('../controllers/bookController');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');

router.get('/', getBooks);
router.get('/:id', getBook);
router.post('/', [auth, admin], addBook);
router.put('/:id', [auth, admin], updateBook);

module.exports = router;