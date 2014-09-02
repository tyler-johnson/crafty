// Dependencies
var path = require("path"),
	Promise = require("bluebird"),
	Environment = require("./env");

// path helper
var baseDir = path.resolve(__dirname, "..");
var resolve = global.$resolve = function(p) {
	return path.resolve(baseDir, p != null ? p : "");
}

// config
var conf =
global.$conf = require("./config");

// Minecraft environment
var env =
global.$env = new Environment(conf.get("cwd"));

// express server & routes
require("./express");

// socket.io
require("./socket");

// init minecraft environment 
env.init().then(function() {
	// load the initial version
	return $env.load($env.props.get("server").get("version"));
})

//start the server
.then(function() {
	console.log("Minecraft environment is ready.");

	$server.listen(conf.get("port"), function() {
		console.log("HTTP server listening on port " + conf.get("port") + "...");
	});
});
