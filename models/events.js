var mongoose = require("mongoose");

var eventSchema = new mongoose.Schema({
	title: String,
	location: String,
	image: String,
	link: String,
	body: String,
	date: Date
});

module.exports = mongoose.model("Event", eventSchema);