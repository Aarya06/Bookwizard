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
	views: {type: Number, default: 0},
	visitors:[{type: String, default: null}],
	created: {type: Date, default: Date.now},
	comments: [
	{
	type: mongoose.Schema.Types.ObjectId,
	ref: "Comment"
	}
	]
});

module.exports = mongoose.model("Blog", blogSchema);