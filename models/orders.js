var mongoose = require("mongoose");

var orderSchema = new mongoose.Schema({
	user: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "User"
	},
	cart: Object,
	address: String,
	firstname: String,
	lastname: String,
	paymentId: String,
	created: {type: Date, default: Date.now}
});

module.exports = mongoose.model("Order", orderSchema);