// Dependencies
var express = require("express"),
	http = require("http"),
	path = require("path"),
	Promise = require("bluebird"),
	Environment = require("./env"),
	Templates = require("./templates"),
	lessMiddleware = require('less-middleware');

// path helper
var baseDir = path.resolve(__dirname, "..");
function resolve(p) {
	return path.resolve(baseDir, p);
}

// config
var conf =
global.$conf = require("./config");

// express app and server
var app = express(),
	server = http.createServer(app);

// Minecraft server environment
var env =
global.$env = new Environment(resolve("minecraft"));

// Templates
var tpl = new Templates(resolve("server/templates"));

// express middleware
if (process.env.NODE_ENV === "development") {
	app.use(express.logger("dev"));
} else {
	app.use(express.logger("default"));
	app.use(express.compress());
}
app.use(lessMiddleware(resolve("public/less"), {
	dest: resolve("public/css")
}));
app.use(tpl.middleware({ layout: "layout" }));
// app.use(express.static(resolve("client/dist")));
app.use(express.static(resolve("public")));

// set up socket.io
require("./socket")(server);

// set up http routes
require("./routes")(app);

// init and start the server
Promise.all([ env.init(), tpl.load() ])
	.then(function() {
		server.listen(conf.get("port"), function() {
			console.log("HTTP server listening on port " + conf.get("port") + "...");
		});
	});
