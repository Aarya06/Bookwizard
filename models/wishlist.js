var mongoose = require("mongoose");

var wishlistSchema = new mongoose.Schema({
	user: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "User"
	},
	items: Object,
	bookId: String,
	created: {type: Date, default: Date.now}
});

module.exports = mongoose.model("Wishlist", wishlistSchema);