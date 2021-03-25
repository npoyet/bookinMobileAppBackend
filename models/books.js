// collection books dans la base Bookin sur MongoDB

var mongoose = require('mongoose');


var booksSchema = mongoose.Schema({
    title: { type: String, required: true },
    cover: { type: String, required: true },
    bookId: { type: String, required: true },
    description: String,
    publisher: String,
    date: String,
    categories: [String],
    authors: [String],
    pageCount: Number,
   });
   
var BooksModel = mongoose.model('books', booksSchema);
module.exports = BooksModel;