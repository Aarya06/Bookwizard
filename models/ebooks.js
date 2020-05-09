var mongoose = require("mongoose");

var ebookSchema = new mongoose.Schema({
	
	title: String, 
	author: String,
	image: String,
	language: {type: String, default: "English"},
	formate:{type: String, default: "PDF"},
	pages: String,
	publication: String,
	category : String,
	download: String,
	description: String,
	created: {type: Date, default: Date.now},
	comments: [
	{
	type: mongoose.Schema.Types.ObjectId,
	ref: "Comment"
	}
	]
});

module.exports = mongoose.model("Ebook", ebookSchema);