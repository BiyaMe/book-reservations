const Book = require('../models/Book');

exports.getBooks = async (req, res) => {
  try {
    const books = await Book.find();
    res.json(books);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

exports.getBook = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) {
      return res.status(404).json({ message: 'Book not found' });
    }
    res.json(book);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

exports.addBook = async (req, res) => {
  try {
    const { title, author, publicationDate, description } = req.body;
    const newBook = new Book({
      title,
      author,
      publicationDate,
      description
    });
    const book = await newBook.save();
    res.json(book);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

exports.updateBook = async (req, res) => {
  try {
    const { title, author, publicationDate, description } = req.body;
    let book = await Book.findById(req.params.id);
    if (!book) {
      return res.status(404).json({ message: 'Book not found' });
    }
    book.title = title || book.title;
    book.author = author || book.author;
    book.publicationDate = publicationDate || book.publicationDate;
    book.description = description || book.description;
    await book.save();
    res.json(book);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};