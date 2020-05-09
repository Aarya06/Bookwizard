var mongoose = require("mongoose");

var blogSchema = new mongoose.Schema({
	title: String,
	image: String,
	body: String,
	category: String,
	postedBy: {
		id:{
			type: mongoose.Schema.Types.ObjectId,
			ref: "User"
		},
		name: String
	},
	created: {type: Date, default: Date.now}
});

module.exports = mongoose.model("Blog", blogSchema);