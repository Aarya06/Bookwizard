// ========================= NPM PACKAGES ======================================
require('dotenv').config({ path: '.env' });
var express = require("express");
var mongoose = require("mongoose");
var passport = require("passport");
var LocalStrategy = require("passport-local");
var expressSession = require("express-session");
var expressSanitizer = require("express-sanitizer");
var bodyParser = require("body-parser");
var flash = require("connect-flash");
var nodemailer = require("nodemailer");
var methodOverride = require("method-override");
var mongoStore = require("connect-mongo")(expressSession);
var GoogleStrategy = require('passport-google-oauth20').Strategy;

var app = express();


// =============================== DB-MODELS =====================================

var Book = require("./models/books");
var Ebook = require("./models/ebooks");
var Blog = require("./models/blogs");
var Event = require("./models/events");
var User = require("./models/users");
var Comment = require("./models/comments");
var Cart = require("./models/cart");
var Order = require("./models/orders");
var Wishlist = require("./models/wishlist");
var Exchange = require("./models/exchange");


// ================================= MONGO-DB CONNECTION ==============================

mongoose.set('useNewUrlParser', true);
mongoose.set('useFindAndModify', false);
mongoose.set('useCreateIndex', true);
mongoose.set('useUnifiedTopology', true);
// mongoose.connect("mongodb://localhost/bookwizard");
mongoose.connect(process.env.mongodb);

// ============================= PASSPORT REQUIREMENTS =================================

app.use(flash());
app.use(expressSession({
	secret: "Authentication",
	resave: false,
	saveUninitialized: false,
	store: new mongoStore({mongooseConnection : mongoose.connection}),
	cookie: { maxAge: 24 * 60 * 60 * 1000}
}));
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use(function(req,res, next){
	res.locals.currentUser = req.user;
	res.locals.session = req.session;
	res.locals.error = req.flash("error");
	res.locals.success = req.flash("success");
	next();
});


// ================================== PASSPORT GOOGLE ======================================

passport.use(new GoogleStrategy({
    clientID: process.env.google_client,
    clientSecret: process.env.google_secret,
    callbackURL: "/auth/google/callback"
},function(accessToken, refreshToken, profile, cb){
	User.findOne({googleId: profile.id }, function (err, user) {
		if(user){
			console.log(user.username);
		}else{
			user = new User({
				googleId: profile.id,
				username: profile.emails[0].value,
				firstname: profile.name.givenName,
				lastname: profile.name.familyName,
				isVerified: true
			});
			user.save();
		}
		return cb(err, user);
	});
}
));

// ===================================== SEND MAIL =================================

var transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.gmailAccount,
    pass: process.env.gmailPass
  }
});

var url = process.env.siteUrl;


// ============================== PACKAGES REQUIREMENTS ===============================

app.use(bodyParser.urlencoded({extended: true}));
app.set("view engine", "ejs");
app.use(express.static(__dirname + "/public"));
app.use(methodOverride("_method"));
app.use(expressSanitizer());




// =================================== ROUTES =================================
// ============================================================================


// HOME PAGE
app.get("/", function(req, res){
	Book.find({bestseller:"Yes"}, function(err, books){
		if(err){
			console.log(err);
			req.flash("error", "Something went wrong");
			res.redirect("back");
		}else{
			res.render("Index/home", {books: books, title:"bookwizard"});
		}
	}).sort({"created":-1});
	
});

// ALL BOOKS PAGE
app.get("/books", function(req, res){
	Book.find({}, function(err, books){
		if(err){
			console.log(err);
			req.flash("error", "Something went wrong");
			res.redirect("back");
		}else{
			res.render("Book/books", {books: books , title:"Books"});
		}
	}).sort({"created":-1});
});

// SEARCH BOOK
app.post("/searchBook", function(req, res){
	Book.find({title: {$regex: new RegExp("^"+req.body.bookname,"i")}}, function(err, books){
		if(err){
			console.log(err);
			req.flash("error", "Something went wrong");
			res.redirect("back");
		}else{
			res.render("Book/books", {books: books , title:"Books"});
		}
	}).sort({"created":-1});
});

// SHOW BOOKS BY CATEGORY
app.get("/books/category/:category", function(req, res){
	var category = req.params.category;
	Book.find({category:category}, function(err, books){
		if(err){
			console.log(err);
			req.flash("error", "Something went wrong");
			res.redirect("back");
		}else{
			res.render("Book/books", {books: books, title:"Books"});
		}
	}).sort({"created":-1});
});

// ADD NEW BOOK FORM
app.get("/books/addBook", isAdmin, function(req, res){
	res.render("Book/addBook",{title:"Books"})
});


// POST NEW BOOK
app.post("/books", isAdmin, function(req, res){
	Book.create(req.body.book, function(err, newBook){
		if(err){
			console.log(err);
			req.flash("error", "Something went wrong");
			res.redirect("back");
		}else{
			res.redirect("/books");
		}
	});
});


// BOOK DETAILS PAGE
app.get("/books/:id", function(req, res){
	Book.findById(req.params.id).populate("comments").exec(function(err, found){
		if(err){
			console.log(err);
			req.flash("error", "Something went wrong");
			res.redirect("back");
		}else{
			var wish = false;
			Wishlist.findOne({bookId:req.params.id, user:req.user._id}, function(err, wishlist){
				if(wishlist){
					wish = true;
					
				}
				res.render("Book/showBook",{book: found, wish:wish, title:"Books" });
			});
			
		}
	});
	
});


// BOOK UPDATE FORM
app.get("/books/:id/edit", isAdmin, function(req, res){
	Book.findById(req.params.id, function(err, found){
		if(err){
			console.log(err);
			req.flash("error", "Something went wrong");
			res.redirect("back");
		}else{
			res.render("Book/editBook", {book: found, title:"Books"});
		}
	});
});


//POST UPDATED BOOK
app.put("/books/:id", isAdmin, function(req, res){
	Book.findByIdAndUpdate(req.params.id, req.body.book, function(err, updatedBook){
		if(err){
			console.log(err);
			req.flash("error", "Something went wrong");
			res.redirect("back");
		}else{
			req.flash("success", "Book Updated");
			res.redirect("/books/" +req.params.id);
		}
	});
});

app.delete("/books/:id", isAdmin, function(req, res){
	Book.findByIdAndRemove(req.params.id, function(err){
		if(err){
			console.log(err);
			req.flash("error", "Something went wrong");
			res.redirect("back");
		}else{
			req.flash("success", "Book Deleted");
			res.redirect("/books");
		}
	});
});

//========================== BOOK COMMENT ROUTE =================================

//Add new comment form
app.get("/books/:id/comments/new", isLoggedIn, function(req,res){
	Book.findById(req.params.id, function(err, book){
		if(err){
			console.log(err);
			req.flash("error", "Something went wrong");
			res.redirect("back");
		}else{
			res.render("Book/comments/addComment", {book: book, title:"Comment"});
		}
	});
});

//Add new comment
app.post("/books/:id/comments", isLoggedIn, function(req, res){
		Book.findById(req.params.id, function(err, book){
			if(err){
				console.log(err);
				req.flash("error", "Something went wrong");
				res.redirect("back");
			}else{
				Comment.create(req.body.comment, function(err, comment){
					if(err){
						console.log(err);
						req.flash("error", "Something went wrong");
						res.redirect("back");
					}else{
						comment.postedBy.id = req.user._id;
						comment.postedBy.name = req.user.firstname;
						comment.save();
						book.comments.push(comment);
						book.save();
						req.flash("success", "Comment Posted")
						res.redirect("/books/"+req.params.id);
					}
				});
			}
		});
});

//Edit a comment form
app.get("/books/:id/comments/:comment_id/edit",(isAdmin || checkCommentOwner), function(req, res){
	Comment.findById(req.params.comment_id, function(err, comment){
		if(err){
			req.flash("error", "Something went wrong");
			res.redirect("back");
		}else{
			res.render("Book/comments/editComment",{book_id: req.params.id, comment:comment, title:"Comment"})
		}
	});
});

// Edit a comment
app.put("/books/:id/comments/:comment_id",(isAdmin || checkCommentOwner), function(req, res){
	Comment.findByIdAndUpdate(req.params.comment_id, req.body.comment, function(err, updatedComment){
		if(err){
			console.log(err);
			req.flash("error", "Something went wrong");
			res.redirect("back");
		}else{
			req.flash("success", "Comment Updated");
			res.redirect("/books/" +req.params.id);
		}
	});
});

//Delete a comment
app.delete("/books/:id/comments/:comment_id",(isAdmin || checkCommentOwner), function(req,res){
	Comment.findByIdAndRemove(req.params.comment_id, function(err, comment){
		if(err){
			console.log(err);
			req.flash("error", "Something went wrong");
			res.redirect("back");
		}else{
			req.flash("success", "Comment deleted");
			res.redirect("/books/"+req.params.id);
		}
	});
});



// =============================== EBOOK ===================================

// ALL EBOOKS PAGE
app.get("/ebooks", function(req, res){
	Ebook.find({}, function(err, ebooks){
		if(err){
			console.log(err);
			req.flash("error", "Something went wrong");
			res.redirect("back");
		}else{
			res.render("Ebook/ebooks", {ebooks: ebooks, title:"Ebooks"});
		}
	}).sort({"created":-1});
});

// SEARCH EBOOK
app.post("/searchEbook", function(req, res){
	Ebook.find({title: {$regex: new RegExp("^"+req.body.ebookname,"i")}}, function(err, ebooks){
		if(err){
			console.log(err);
			req.flash("error", "Something went wrong");
			res.redirect("back");
		}else{
			res.render("Ebook/ebooks", {ebooks: ebooks , title:"Ebooks"});
		}
	}).sort({"created":-1});
});

// SHOW EBOOKS BY CATEGORY
app.get("/ebooks/category/:category", function(req, res){
	var category = req.params.category ;
	Ebook.find({category:category}, function(err, ebooks){
		if(err){
			console.log(err);
			req.flash("error", "Something went wrong");
			res.redirect("back");
		}else{
			res.render("Ebook/ebooks", {ebooks: ebooks, title:"Ebooks"});
		}
	}).sort({"created":-1});
});


// ADD NEW EBOOK FORM
app.get("/ebooks/addEbook", isAdmin, function(req, res){
	res.render("Ebook/addEbook",{title:"Ebooks"})
});


// POST NEW EBOOK
app.post("/ebooks", isAdmin, function(req, res){
	Ebook.create(req.body.ebook, function(err, newEbook){
		if(err){
			console.log(err);
			req.flash("error", "Something went wrong");
			res.redirect("back");
		}else{
			res.redirect("/ebooks");
		}
	});
});


// EBOOK DETAILS PAGE
app.get("/ebooks/:id", function(req, res){
	Ebook.findById(req.params.id).populate("comments").exec(function(err, found){
		if(err){
			console.log(err);
			req.flash("error", "Something went wrong");
			res.redirect("back");
		}else{
			res.render("Ebook/showEbook",{ebook: found, title:"Ebooks"});
		}
	});
	
});

// UPDATE EBOOK FORM
app.get("/ebooks/:id/edit", isAdmin, function(req, res){
	Ebook.findById(req.params.id, function(err, found){
		if(err){
			console.log(err);
			req.flash("error", "Something went wrong");
			res.redirect("back");
		}else{
			res.render("Ebook/editEbook", {ebook: found, title:"Ebooks"});
		}
	});
});

// POST UPDATED EBOOK
app.put("/ebooks/:id", isAdmin, function(req, res){
	Ebook.findByIdAndUpdate(req.params.id, req.body.ebook, function(err, updatedEbook){
		if(err){
			console.log(err);
			req.flash("error", "Something went wrong");
			res.redirect("back");
		}else{
			req.flash("success", "Ebook Updated");
			res.redirect("/ebooks/" +req.params.id);
		}
	});
});

app.delete("/ebooks/:id", isAdmin, function(req, res){
	Ebook.findByIdAndRemove(req.params.id, function(err){
		if(err){
			console.log(err);
			req.flash("error", "Something went wrong");
			res.redirect("back");
		}else{
			req.flash("success", "Ebook Deleted");
			res.redirect("/ebooks");
		}
	});
});


//========================== EBOOK COMMENT ROUTE =================================

//Add new comment form
app.get("/ebooks/:id/comments/new", isLoggedIn, function(req,res){
	Ebook.findById(req.params.id, function(err, ebook){
		if(err){
			console.log(err);
			req.flash("error", "Something went wrong");
			res.redirect("back");
		}else{
			res.render("Ebook/comments/addComment", {ebook: ebook, title:"Comment"});
		}
	});
});

//Add new comment
app.post("/ebooks/:id/comments", isLoggedIn, function(req, res){
		Ebook.findById(req.params.id, function(err, ebook){
			if(err){
				console.log(err);
				req.flash("error", "Something went wrong");
				res.redirect("back");
			}else{
				Comment.create(req.body.comment, function(err, comment){
					if(err){
						console.log(err);
						req.flash("error", "Something went wrong");
						res.redirect("back");
					}else{
						comment.postedBy.id = req.user._id;
						comment.postedBy.name = req.user.firstname;
						comment.save();
						ebook.comments.push(comment);
						ebook.save();
						req.flash("success", "Comment Posted")
						res.redirect("/ebooks/"+req.params.id);
					}
				});
			}
		});
});

//Edit a comment form
app.get("/ebooks/:id/comments/:comment_id/edit",(isAdmin || checkCommentOwner), function(req, res){
	Comment.findById(req.params.comment_id, function(err, comment){
		if(err){
			req.flash("error", "Something went wrong");
			res.redirect("back");
		}else{
			res.render("Ebook/comments/editComment",{ebook_id: req.params.id, comment:comment, title:"Comment"});
		}
	});
});

// Edit a comment
app.put("/ebooks/:id/comments/:comment_id",(isAdmin || checkCommentOwner), function(req, res){
	Comment.findByIdAndUpdate(req.params.comment_id, req.body.comment, function(err, updatedComment){
		if(err){
			console.log(err);
			req.flash("error", "Something went wrong");
			res.redirect("back");
		}else{
			req.flash("success", "Comment Updated");
			res.redirect("/ebooks/" +req.params.id);
		}
	});
});

//Delete a comment
app.delete("/ebooks/:id/comments/:comment_id", (isAdmin ||checkCommentOwner), function(req,res){
	Comment.findByIdAndRemove(req.params.comment_id, function(err, comment){
		if(err){
			console.log(err);
			req.flash("error", "Something went wrong");
			res.redirect("back");
		}else{
			req.flash("success", "Comment deleted");
			res.redirect("/ebooks/"+req.params.id);
		}
	});
});


// ============================== BLOG ===================================

// ALL BLOGS PAGE
app.get("/blogs", function(req, res){
	Blog.find({}, function(err, blogs){
		if(err){
			console.log(err);
			req.flash("error", "Something went wrong");
			res.redirect("back");
		}else{
			res.render("Blog/blogs", {blogs:blogs, title:"Blogs"});
		}
	}).sort({"created":-1});
});

// WRITE A NEW BLOG FORM
app.get("/blogs/addBlog", isLoggedIn, function(req, res){
	res.render("Blog/addBlog",{title:"Blogs"});
});

//POST A NEW BLOG
app.post("/blogs", isLoggedIn, function(req, res){
	req.body.blog.body = req.sanitize(req.body.blog.body);
	Blog.create(req.body.blog, function(err, newBlog){
		if(err){
			console.log(err);
			req.flash("error", "Something went wrong");
			res.redirect("back");
		}else{
			newBlog.postedBy.id = req.user._id;
			newBlog.postedBy.name = req.user.firstname;
			newBlog.save();
			res.redirect("/blogs");
		}
	});
});


// READ BLOG
app.get("/blogs/:id", function(req, res){
	Blog.findById(req.params.id).populate("comments").exec(function(err, foundBLog){
		if(err){
			console.log(err);
			req.flash("error", "Something went wrong");
			res.redirect("back")
		}else{
			res.render("Blog/showBlog", {blog: foundBLog, title:"Blogs"});
		}
	});
});


// UPDATE YOUR BLOG FORM
app.get("/blogs/:id/edit", (isAdmin || isBlogOwner), function(req, res){
	Blog.findById(req.params.id, function(err, found){
		if(err){
			console.log(err);
			req.flash("error", "Something went wrong");
			res.redirect("back");
		}else{
			res.render("Blog/editBlog", {blog: found, title:"Blogs"});
		}
	});
});


// POST UPDATED BLOG
app.put("/blogs/:id", (isAdmin || isBlogOwner), function(req, res){
	Blog.findByIdAndUpdate(req.params.id, req.body.blog, function(err, updatedBlog){
		if(err){
			console.log(err);
			req.flash("error", "Something went wrong");
			res.redirect("back");
		}else{
			req.flash("success", "Blog Updated");
			res.redirect("/blogs/" +req.params.id);
		}
	});
});

app.delete("/blogs/:id", (isAdmin || isBlogOwner), function(req, res){
	Blog.findByIdAndRemove(req.params.id, function(err){
		if(err){
			console.log(err);
			req.flash("error", "Something went wrong");
			res.redirect("back");
		}else{
			req.flash("success", "Blog Deleted");
			res.redirect("/blogs");
		}
	});
});

//========================== BLOG COMMENT ROUTE =================================

//Add new comment form
app.get("/blogs/:id/comments/new", isLoggedIn, function(req,res){
	Blog.findById(req.params.id, function(err, blog){
		if(err){
			console.log(err);
			req.flash("error", "Something went wrong");
			res.redirect("back");
		}else{
			res.render("Blog/comments/addComment", {blog: blog, title:"Comment"});
		}
	});
});

//Add new comment
app.post("/blogs/:id/comments", isLoggedIn, function(req, res){
		Blog.findById(req.params.id, function(err, blog){
			if(err){
				console.log(err);
				req.flash("error", "Something went wrong");
				res.redirect("back");
			}else{
				Comment.create(req.body.comment, function(err, comment){
					if(err){
						console.log(err);
						req.flash("error", "Something went wrong");
						res.redirect("back");
					}else{
						comment.postedBy.id = req.user._id;
						comment.postedBy.name = req.user.firstname;
						comment.save();
						blog.comments.push(comment);
						blog.save();
						req.flash("success", "Comment Posted")
						res.redirect("/blogs/"+req.params.id);
					}
				});
			}
		});
});

//Edit a comment form
app.get("/blogs/:id/comments/:comment_id/edit",(isAdmin || checkCommentOwner), function(req, res){
	Comment.findById(req.params.comment_id, function(err, comment){
		if(err){
			req.flash("error", "Something went wrong");
			res.redirect("back");
		}else{
			res.render("Blog/comments/editComment",{blog_id: req.params.id, comment:comment, title:"Comment"})
		}
	});
});

// Edit a comment
app.put("/blogs/:id/comments/:comment_id",(isAdmin || checkCommentOwner), function(req, res){
	Comment.findByIdAndUpdate(req.params.comment_id, req.body.comment, function(err, updatedComment){
		if(err){
			console.log(err);
			req.flash("error", "Something went wrong");
			res.redirect("back");
		}else{
			req.flash("success", "Comment Updated");
			res.redirect("/blogs/" +req.params.id);
		}
	});
});

//Delete a comment
app.delete("/blogs/:id/comments/:comment_id",(isAdmin || checkCommentOwner), function(req,res){
	Comment.findByIdAndRemove(req.params.comment_id, function(err, comment){
		if(err){
			console.log(err);
			req.flash("error", "Something went wrong");
			res.redirect("back");
		}else{
			req.flash("success", "Comment deleted");
			res.redirect("/blogs/"+req.params.id);
		}
	});
});

// ================================= EXCHANGE ==================================

// ALL EXCHANGE REQUESTS
app.get("/exchange", function(req,res){
	Exchange.find({}, function(err, exchange){
		if(err){
			console.log(err);
			req.flash("error", "Something went wrong");
			res.redirect("back");
		}else{
			res.render("Exchange/exchange",{exchange: exchange, title:"exchange"});
		}
	}).sort({"created":-1});
});

// SEARCH EXCHANGE
app.post("/searchExchange", function(req, res){
	Exchange.find({b2_Title: {$regex: new RegExp("^"+req.body.exchangename,"i")}}, function(err, exchange){
		if(err){
			console.log(err);
			req.flash("error", "Something went wrong");
			res.redirect("back");
		}else{
			res.render("Exchange/exchange", {exchange: exchange , title:"Exchange"});
		}
	}).sort({"created":-1});
});

// POST EXCHANGE FORM
app.get("/exchange/new", isLoggedIn, function(req,res){
	res.render("Exchange/addExchange",{title:"exchange"});
});

// POST NEW EXCHANGE
app.post("/exchange", isLoggedIn, function(req, res){
	Exchange.create(req.body.exchange, function(err, newExchange){
		if(err){
			console.log(err);
			req.flash("error", "Something went wrong");
			res.redirect("back");
		}else{
			newExchange.postedBy.id = req.user._id;
			newExchange.postedBy.firstname = req.user.firstname;
			newExchange.postedBy.lastname = req.user.lastname;
			newExchange.save();
			res.redirect("/exchange");
		}
	});
});

// VIEW EXCHANGE DETAILS
app.get("/exchange/:id",isLoggedIn, function(req,res){
	Exchange.findById(req.params.id, function(err, found){
		if(err){
			console.log(err);
			req.flash("error", "Something went wrong");
			res.redirect("back");
		}else{
			res.render("Exchange/showExchange",{exchange:found, title:"exchange"});
		}
	});
	
});

// EXCHANGE UPDATE FORM
app.get("/exchange/:id/edit",(isAdmin || isExchangeOwner), function(req, res){
	Exchange.findById(req.params.id, function(err, found){
		if(err){
			console.log(err);
			req.flash("error", "Something went wrong");
			res.redirect("back");
		}else{
			res.render("Exchange/editExchange", {exchange: found, title:"Exchange"});
		}
	});
});


//POST UPDATED EXCHANGE
app.put("/exchange/:id",(isAdmin || isExchangeOwner), function(req, res){
	Exchange.findByIdAndUpdate(req.params.id, req.body.exchange, function(err, updatedExchange){
		if(err){
			console.log(err);
			req.flash("error", "Something went wrong");
			res.redirect("back");
		}else{
			req.flash("success", "Exchange Updated");
			res.redirect("/exchange/" +req.params.id);
		}
	});
});

// EXCHANGE DELETE
app.delete("/exchange/:id",(isAdmin || isExchangeOwner), function(req, res){
	Exchange.findByIdAndRemove(req.params.id, function(err){
		if(err){
			console.log(err);
			req.flash("error", "Something went wrong");
			res.redirect("back");
		}else{
			req.flash("success", "Exchange Deleted");
			res.redirect("/exchange");
		}
	});
});


// ===================================== EVENTS =========================================

// ALL EVENTS PAGE
app.get("/events", function(req, res){
	Event.find({}, function(err, events){
		if(err){
			console.log(err);
			req.flash("error", "Something went wrong");
			res.redirect("back");
		}else{
			res.render("Event/events",{events:events, title:"Events"});
		}
	}).sort({"date":1});
	
});


// ADD NEW EVENT FORM
app.get("/events/addEvent", isAdmin, function(req, res){
	res.render("Event/addEvent",{title:"Events"})
});


// POST NEW EVENT
app.post("/events", isAdmin, function(req, res){
	Event.create(req.body.event, function(err, newEvent){
		if(err){
			console.log(err);
			req.flash("error", "Something went wrong");
			res.redirect("back");
		}else{
			res.redirect("/events");
		}
	});
});


// UPDATE EVENT FORM
app.get("/events/:id/edit", isAdmin, function(req, res){
	Event.findById(req.params.id, function(err, found){
		if(err){
			console.log(err);
			req.flash("error", "Something went wrong");
			res.redirect("back");
		}else{
			res.render("Event/editEvent", {event: found, title:"Events"});
		}
	});
});


//POST UPDATED EVENT
app.put("/events/:id", isAdmin, function(req, res){
	Event.findByIdAndUpdate(req.params.id, req.body.event, function(err, updatedEvent){
		if(err){
			console.log(err);
			req.flash("error", "Something went wrong");
			res.redirect("back");
		}else{
			req.flash("success", "Event Updated");
			res.redirect("/events");
		}
	});
});


// DELETE EVENT
app.delete("/events/:id", isAdmin, function(req, res){
	Event.findByIdAndRemove(req.params.id, function(err){
		if(err){
			console.log(err);
			req.flash("error", "Something went wrong");
			res.redirect("back");
		}else{
			req.flash("success", "Event Deleted");
			res.redirect("/events");
		}
	});
});

// ===================================== SHOP ===========================================

// SHOPPING CART PAGE
app.get("/cart", function(req, res){
	if(!req.session.cart){
		return res.render("Shop/cart", {books: null, title:"Cart"});
	}
	var cart = new Cart(req.session.cart);
	res.render("Shop/cart",  {books: cart.getItems(), totalPrice: cart.totalPrice, title:"Cart"});
	
});


// ADD ITEMS TO SHOPPING CART
app.get("/cart/add/:id", function(req, res){
	var cart = new Cart(req.session.cart ? req.session.cart : {});
	
	Book.findById(req.params.id, function(err, book){
		if(err){
			console.log(err);
			req.flash("error", "Something went wrong");
			return res.redirect("back");
		}
		cart.add(book, book.id);
		req.session.cart = cart;
		console.log(req.session.cart);
		res.redirect("/books");
	});
});


// REMOVE ITEMS FROM SHOPPING CART
app.get("/cart/remove/:id", function(req, res){
	var cart = new Cart(req.session.cart ? req.session.cart : {});
	cart.remove(req.params.id);
	req.session.cart = cart;
	res.redirect("/cart");
});

// CHECKOUT FORM
app.get("/checkout", isLoggedIn, function(req,res){
	if(!req.session.cart){
		return res.redirect("/cart");
	}
	var cart = new Cart(req.session.cart);
	res.render("Shop/checkout",  {books: cart.getItems(), totalPrice: cart.totalPrice, title:"Checkout"});
});

// CHECKOUT THE ITEMS
app.post("/checkout", isLoggedIn, function(req, res){
	if(!req.session.cart){
		return res.redirect("/cart");
	}
	var cart = new Cart(req.session.cart);
	var stripe = require('stripe')(process.env.stripe_test);

	stripe.charges.create(
	  { 
		amount: cart.totalPrice * 100 ,
		currency: 'inr',
		description: 'Example charge',
  		source: req.body.stripeToken,
	  },
	  function(err, charge) {
		if(err){
			req.flash("error", err.message);
			return res.redirect("back");
		}
		  var order = new Order({
			  user: req.user,
			  cart: cart,
			  address: req.body.address,
			  firstname: req.body.firstName,
			  lastname: req.body.lastName,
			  paymentId: charge.id
		  });
		  order.save(function(err, result){
			  if(err){
				  console.log(err);
				  req.flash("error", "Something went wrong");
				  res.redirect("back");
			  }else{
				  req.session.cart = null;
				  var mailOptions = {
					  from: 'BOOKWIZARD',
					  to: req.user.username,
					  subject: 'ORDER CONFIRMATION',
					  text: 'CHECK YOUR ACCOUNT FOR DETAILS',
					  html: `Your order has been confirmed. Check your account for more details or click <a href = "${url}/myAccount">here</a>`
				  };
				  transporter.sendMail(mailOptions, function(error, info){
					  if (error) {
						  console.log(error);
					  } else {
						  console.log('Email sent: ' + info.response);
					  }
				  });
				  req.flash("success", "Payment Succesful");
				  res.redirect("/");
			  }
		  });
	  }
	);
});


// ===================================== AUTH ===================================

// LOGIN FORM
app.get("/login", function(req, res){
	res.render("Authentication/signin",{title:"Log In"});
});

// 	VERIFY EMAIL
app.get("/verify/:token", function(req,res){
	User.findByIdAndUpdate(req.params.token,{isVerified:true}, function(err,user){
		res.redirect("/login");
	});
});

// LOGIN
app.post("/login", passport.authenticate("local", {
	failureRedirect: "/login",
	failureFlash: true
}),isVerified, function(req, res){
	if(req.session.oldUrl){
		var rediectUrl = req.session.oldUrl;
		req.session.oldUrl = null;
		res.redirect(rediectUrl);
	}else{
		req.flash("success", "Welcome Back "+ req.user.firstname);
		res.redirect("/");
	}
});


// LOGOUT
app.get("/logout", function(req,res){
	req.logout();
	req.flash("success", "Logged Out")
	res.redirect("/");
});


// REGISTERATION FORM
app.get("/register", function(req, res){
	res.render("Authentication/register",{title:"Register"});
});


// REGISTER
app.post("/register", function(req, res){
	var newUser = new User({username: req.body.username, firstname: req.body.firstname, lastname: req.body.lastname});
	var password = req.body.password;
	User.register(newUser, password, function(err, user){
		if(err){
			console.log(err)
			req.flash("error", err.message);
			return res.redirect("/register");
		}
		var token = user._id;
		var mailOptions = {
			from: 'BOOKWIZARD',
			to: user.username,
			subject: 'EMAIL VERIFICATION',
			text: 'CLICK TO VERIFY',
			html:`Click <a href = "${url}/verify/${token}">here</a> to verify your email`
		};
		transporter.sendMail(mailOptions, function(error, info){
			if (error) {
				console.log(error);
			} else {
				console.log('Email sent: ' + info.response);
			}
		});
		// passport.authenticate("local")(req, res, function(){
		// 	if(req.session.oldUrl){
		// 		var rediectUrl = req.session.oldUrl;
		// 		req.session.oldUrl = null;
		// 		res.redirect(rediectUrl);
		// 	}else{
		// 		req.flash("success", "Welcome to bookwizard "+ user.firstname);
		// 		res.redirect("/");
		// 	}
		// });
		req.flash("success", "Registration successful. Verification link sent to your email");
		res.redirect("/login");
	});
});


// GOOGLE LOGIN PAGE
app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile','email'] }));


// GOOGLE LOGIN
app.get('/auth/google/callback', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    res.redirect('/');
  });

// ========================================= INDEX ==============================================

// ADMIN PAGE
app.get("/admin", isAdmin, function(err, res){
	res.render("Index/admin",{title:"Admin Area"});
});

// MY ACCOUNT
app.get("/myAccount", isLoggedIn, function(req, res){
	Wishlist.find({user: req.user}, function(err, wishlist){
		if(err){
			console.log(err);
			req.flash("error", "Something went wrong");
			res.redirect("back");
		}
		Blog.find({"postedBy.id": req.user._id}, function(err, blog){
			if(err){
				console.log(err);
				req.flash("error", "Something went wrong");
				res.redirect("back");
			}
			Exchange.find({"postedBy.id": req.user._id}, function(err, exchange){
				if(err){
					console.log(err);
					req.flash("error", "Something went wrong");
					res.redirect("back");
				}
				Order.find({user: req.user}, function(err, orders){
					if(err){
						console.log(err);
						req.flash("error", "Something went wrong");
						res.redirect("back");
					}else{
						var cart;
						orders.forEach(function(order){
							cart = new Cart(order.cart);
							order.items = cart.getItems();
						});
					}
					res.render("Index/myAccount",{ orders: orders, exchange: exchange, blog:blog, wishlist: wishlist, title:"My Orders"});
				}).sort({"created":-1});
			}).sort({"created":-1});
		}).sort({"created":-1});
	}).sort({"created":-1});
});


// ADD TO WISHLIST
app.get("/wishlist/add/:id",isLoggedIn, function(req, res){	
	Book.findById(req.params.id, function(err, book){
		if(err){
			console.log(err);
			req.flash("error", "Something went wrong");
			return res.redirect("back");
		}
		Wishlist.findOne({bookId:req.params.id, user:req.user._id}, function(err, wishlist){
			if(wishlist){
				req.flash("success", "Already exist in your wishlist");
				res.redirect("/books/"+req.params.id);
			}else{
				wishlist = new Wishlist({
				user: req.user._id,
				items: book,
				bookId: req.params.id
				});
				wishlist.save();
				
				req.flash("success", "Added to wishlist");
				res.redirect("/books/"+req.params.id);
			}
		});
	});
});


// REMOVE ITEM FROM WISHLIST
app.get("/wishlist/remove/:id", isLoggedIn, function(req, res){
	Wishlist.findByIdAndRemove(req.params.id, function(err){
		if(err){
			console.log(err);
			req.flash("error", "Something went wrong");
			res.redirect("back");
		}else{
			req.flash("success", "Removed from Wishlist");
			res.redirect("/myAccount");
		}
	});
});

// ================================== MIDDLEWARE FUNCTIONS =====================================

// CHECK LOGIN FUNCTION
function isLoggedIn(req, res, next){
	if(req.isAuthenticated()){
		return next();
	}
	req.session.oldUrl = req.url;
	req.flash("error", "Please login first !")
	res.redirect("/login");
}

function isVerified(req, res, next){
	try{
		if(!req.user.isVerified){
				throw new Error('Please verify your email to login');
		}
	}catch(err){
		req.logout();
		req.flash("error", err.message);
		return res.redirect("/login")
	}
	next();
}

// CHECK ADMIN FUNCTION
function isAdmin(req, res, next){
	if(req.isAuthenticated()){
		if(req.user.username === "bookwizard.net@gmail.com"){
			next();
		}else{
			req.flash("error", "Permission Denied");
			res.redirect("back");
		}
	}else{
		req.session.oldUrl = req.url;
		req.flash("error", "Please login first !")
		res.redirect("/login");
	}
}

// CHECK BLOG OWNER FUNCTION
function isBlogOwner(req, res, next){
	if(req.isAuthenticated()){
		Blog.findById(req.params.id, function(err, found){
			if(err){
				console.log(err);
				req.flash("error", err.message);
				res.redirect("back");
			}else{
				if(found.postedBy.id.equals(req.user._id)){
					   next();
				}else{
					req.flash("error", "Permission denied");
					res.redirect("back");
				}
			}
		});
	}else{
		req.session.oldUrl = req.url;
		req.flash("error", "Please login first !")
		res.redirect("/login");
	}
}

// CHECK EXCHANGE OWNER FUNCTION
function isExchangeOwner(req, res, next){
	if(req.isAuthenticated()){
		Exchange.findById(req.params.id, function(err, found){
			if(err){
				console.log(err);
				req.flash("error", err.message);
				res.redirect("back");
			}else{
				if(found.postedBy.id.equals(req.user._id)){
					   next();
				}else{
					req.flash("error", "Permission denied");
					res.redirect("back");
				}
			}
		});
	}else{
		req.session.oldUrl = req.url;
		req.flash("error", "Please login first !")
		res.redirect("/login");
	}
}

// CHECK COMMENT OWNER
function checkCommentOwner(req, res, next){
	if(req.isAuthenticated()){
		Comment.findById(req.params.comment_id, function(err, found){
			if(err){
				console.log(err);
				req.flash("error", err.message);
				res.redirect("back");
			}else{
				if(found.postedBy.id.equals(req.user._id)){
					   next();
				}else{
					req.flash("error", "Permission Denied");
					res.redirect("back");
				}
			}
		});
	}else{
		req.flash("error", "Please login first");
		res.redirect("back");
	}
}


// SERVER 
let port = process.env.PORT;
if(port == null || port == ""){
	port = 4000;
}

app.listen(port, function(){
	console.log("Server has been Started");
});