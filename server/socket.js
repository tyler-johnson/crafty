// Dependencies
var _ = require("underscore"),
	fs = require("fs"),
	Promise = require("bluebird");

function noop(){}

// the socket.io server
var io =
module.exports = require('socket.io').listen($server, {
	"log level": 1,
	"log colors": false,
	"browser client minification": true,
	"browser client gzip": true,
	"browser client etag": true
});

// module.exports = function(server) {

// 	// parts
// 	var counting = false,
// 		io = require('socket.io').listen(server, {
// 			"log level": 1,
// 			"log colors": false,
// 			"browser client minification": true,
// 			"browser client gzip": true,
// 			"browser client etag": true
// 		});

// 	// connects the mincraft server and socket.io
// 	$env.on("init", function() {
// 		var craft = $env.server();

// 		craft.on("error", function(err) {
// 			console.log(err.toString());
// 		});

// 		[ "start", "stop", "ready", "exit" ].forEach(function(event) {
// 			craft.on(event, function() {
// 				io.sockets.emit("server:stateChange", craft.state);
// 			});
// 		});

// 		[ "version", "join", "leave", "data", "line" ].forEach(function(event) {
// 			var emit = _.bind(io.sockets.emit, io.sockets, "server:" + event);
// 			craft.on(event, emit);
// 		});

// 		_.each(io.sockets.sockets, clientAPI);
// 		io.sockets.on('connection', clientAPI);

// 		function clientAPI(socket) {
// 			function method(name, fn) {
// 				socket.on(name, function() {
// 					var args = _.toArray(arguments);
// 					if (!_.isFunction(_.last(args))) args.push(noop);
// 					fn.apply(this, args);
// 				});
// 			}

// 			method("server:start", function(fn) {
// 				$env.start(fn);
// 			});

// 			method("server:stop", function(sec, fn) {
// 				if (_.isFunction(sec) && fn == null) {
// 					fn = sec;
// 					sec = 0;
// 				}

// 				if (counting) return fn(false);
				
// 				if (isNaN(sec) || sec < 1) {
// 					craft.stop();
// 					fn(true);
// 					return;
// 				}

// 				counting = true;
// 				countdown();
// 				var i = setInterval(countdown, 1000);
// 				fn(true);

// 				function countdown() {
// 					if (sec > 0) {
// 						craft.say("Server is shutting down in " + sec + "...");
// 					} else {
// 						craft.stop();
// 						clearInterval(i);
// 						counting = false;
// 					}
// 					sec--;
// 				}
// 			});

// 			method("server:state", function(fn) {
// 				fn(craft.state);
// 			});

// 			method("server:command", function() {
// 				var args = _.toArray(arguments).filter(_.isString);
// 				craft.command(args);
// 			});

// 			method("players", function(fn) {
// 				fn(_.keys(craft.players));
// 			});

// 			method("props:read", function(id, done) {
// 				if (_.isFunction(id) && done == null) {
// 					done = id;
// 					id = null;
// 				}

// 				if (id == null) done($env.props.toJSON());
// 				else {
// 					var prop = $env.props.get(id);
// 					done(prop != null ? prop.toJSON() : null);
// 				}
// 			});

// 			method("props:update", function(id, data, done) {

// 			});

// 			method("props:delete", function(id, done) {

// 			});

// 			// method("props", function(data, fn) {
// 			// 	if (_.isFunction(data) && fn == null) {
// 			// 		fn = data;
// 			// 		data = null;
// 			// 	}

// 			// 	if (_.isObject(data)) $env.prop(null, data).then(fn);
// 			// 	else fn($env.prop());
// 			// });
// 		}
// 	});

// 	return io;

// }