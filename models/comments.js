var mongoose = require("mongoose");

var commentSchema = new mongoose.Schema({
    text: String,
    postedBy: {
		id:{
			type: mongoose.Schema.Types.ObjectId,
			ref: "User"
		},
		name: String
	},
	created: {type: Date, default: Date.now} 
	
});

module.exports = mongoose.model("Comment", commentSchema);