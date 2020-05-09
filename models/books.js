var mongoose = require("mongoose");

var bookSchema = new mongoose.Schema({
	
	title: String, 
	author: String,
	image: String,
	price: Number,
	language: {type: String, default: "English"},
	pages: String,
	publication: String,
	category: String,
	description: String,
	created: {type: Date, default: Date.now},
	bestseller: {type:String, default: "No"},
	comments: [
	{
	type: mongoose.Schema.Types.ObjectId,
	ref: "Comment"
	}
	]
});

module.exports = mongoose.model("Book", bookSchema);