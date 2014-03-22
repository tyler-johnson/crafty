// Dependencies
var express = require("express"),
	http = require("http"),
	path = require("path"),
	Promise = require("bluebird"),
	Environment = require("./env"),
	Templates = require("./templates");

// path helper
var baseDir = path.resolve(__dirname, "..");
function resolve(p) {
	return path.resolve(baseDir, p);
}

// express app and server
var app = express(),
	server = http.createServer(app);

// Minecraft server environment
var env =
global.$env = new Environment(resolve("minecraft"));

// Templates
var tpl = new Templates(resolve("client/templates"));

// express middleware
app.use(express.logger("dev"));
app.use(tpl.middleware({ layout: "layout" }));
app.use(express.static(resolve("client/dist")));
app.use(express.static(resolve("public")));

// set up socket.io
require("./socket")(server);

// set up http routes
require("./routes")(app);

// init and start the server
Promise.all([ env.init(), tpl.load() ])
	.then(function() {
		server.listen(3000, function() {
			console.log("HTTP server listening on port 3000...");
		});
	});