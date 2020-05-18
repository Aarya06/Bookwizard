var mongoose = require("mongoose");

var exchangeSchema = new mongoose.Schema({
	
	b1_Title: String,
	b1_Author: String,
	b2_Title: String,
	b2_Author: String,
	b1_Image: String,
	b2_Image: String,
	postedBy: {
		id:{
			type: mongoose.Schema.Types.ObjectId,
			ref: "User"
		},
		firstname: String,
		lastname: String,
	},
	address: String,
	contact: Number,
	created: {type: Date, default: Date.now}
});

module.exports = mongoose.model("Exchange", exchangeSchema);