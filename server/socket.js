// Dependencies
var _ = require("underscore"),
	fs = require("fs"),
	Promise = require("bluebird"),
	IONamespace = require('socket.io/lib/namespace');

function noop(){}

// the socket.io server
var io =
module.exports = require('socket.io').listen($server, {
	serveClient: false
});

// properties API
var propsAPI = clientAPI()
.on("accept-eula", function(done) {
	$env.acceptEULA().finally(done);
})
.on("props:read", function(id, done) {
	if (_.isFunction(id) && done == null) {
		done = id;
		id = null;
	}

	if (id == null) done($env.props.toJSON());
	else {
		var prop = $env.props.get(id);
		done(prop != null ? prop.toJSON() : null);
	}
})
.connect(io.sockets);

// on server load, integrate
$env.on("load", function(craft) {
	craft.on("error", function(err) {
		console.log(err.toString());
	});

	[ "start", "stop", "ready", "exit" ].forEach(function(event) {
		craft.on(event, function() {
			io.sockets.emit("server:state", craft.state);
		});
	});

	[ "version", "join", "leave", "data", "line", "eula" ].forEach(function(event) {
		var emit = io.sockets.emit.bind(io.sockets, "server:" + event);
		craft.on(event, emit);
	});

	var craftAPI = clientAPI()
	.on("server:state", function(fn) {
		fn(craft.state);
	})
	.on("server:start", function(fn) {
		$env.start().then(fn);
	})
	.on("server:stop", function(sec, fn) {
		if (_.isFunction(sec) && fn == null) {
			fn = sec;
			sec = 0;
		}

		$env.stop(sec).finally(fn);
	})
	.on("server:restart", function(sec, fn) {
		$env.stop().delay(1000).then($env.start).finally(fn);
	})
	.on("server:command", function() {
		var args = _.toArray(arguments).filter(_.isString);
		craft.command(args);
	})
	.connect(io.sockets);

	// next unload is this server instance
	$env.once("unload", craftAPI.disconnect);
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



// 		_.each(io.sockets.sockets, clientAPI);
// 		io.sockets.on('connection', clientAPI);

		
// 	});

// 	return io;

// }

// function clientAPI(craft) {
// 	var methods = [];

// 	function method(name, fn) {
// 		methods.push([ name, callback ]);
// 		socket.on(name, callback);

// 		function callback() {
// 			var args = _.toArray(arguments);
// 			if (!_.isFunction(_.last(args))) args.push(noop);
// 			fn.apply(this, args);
// 		}
// 	}

// 	method("server:start", function(fn) {
// 		$env.start(fn);
// 	});

// 	method("server:stop", function(sec, fn) {
// 		if (_.isFunction(sec) && fn == null) {
// 			fn = sec;
// 			sec = 0;
// 		}

// 		if (counting) return fn(false);
		
// 		if (isNaN(sec) || sec < 1) {
// 			craft.stop();
// 			fn(true);
// 			return;
// 		}

// 		counting = true;
// 		countdown();
// 		var i = setInterval(countdown, 1000);
// 		fn(true);

// 		function countdown() {
// 			if (sec > 0) {
// 				craft.say("Server is shutting down in " + sec + "...");
// 			} else {
// 				craft.stop();
// 				clearInterval(i);
// 				counting = false;
// 			}
// 			sec--;
// 		}
// 	});

// 	method("server:state", function(fn) {
// 		fn(craft.state);
// 	});

// 	method("server:command", function() {
// 		var args = _.toArray(arguments).filter(_.isString);
// 		craft.command(args);
// 	});

// 	method("players", function(fn) {
// 		fn(_.keys(craft.players));
// 	});

// 	method("props:read", function(id, done) {
		// if (_.isFunction(id) && done == null) {
		// 	done = id;
		// 	id = null;
		// }

		// if (id == null) done($env.props.toJSON());
		// else {
		// 	var prop = $env.props.get(id);
		// 	done(prop != null ? prop.toJSON() : null);
		// }
// 	});

// 	method("props:update", function(id, data, done) {

// 	});

// 	method("props:delete", function(id, done) {

// 	});

// 	method("props", function(data, fn) {
// 		if (_.isFunction(data) && fn == null) {
// 			fn = data;
// 			data = null;
// 		}

// 		if (_.isObject(data)) $env.prop(null, data).then(fn);
// 		else fn($env.prop());
// 	});

// 	return function() {
// 		methods.forEach(function(m) {
// 			socket.off(m[0], m[1]);
// 		});
// 	}
// }

function clientAPI() {
	var api,
		open = {},
		methods = [];

	return api = {
		on: function(name, fn) {
			methods.push([ name, function() {
				var args = _.toArray(arguments);
				if (!_.isFunction(_.last(args))) args.push(noop);
				fn.apply(this, args);
			} ]);

			return api;
		},

		connect: function(socket) {
			if (socket instanceof IONamespace) {
				_.each(socket.sockets, api.connect);
				socket.on('connection', api.connect);
				return api;
			}

			api.disconnect(socket);

			var fns = methods.slice(0);
			fns.forEach(function(m) { socket.on(m[0], m[1]); });
			socket.on("disconnect", open[socket.id] = clean);

			function clean() {
				fns.forEach(function(m) { socket.removeListener(m[0], m[1]); });
				socket.removeListener("disconnect", clean);
				delete open[socket.id];
			}

			return api;
		},

		disconnect: function(socket) {
			if (socket == null) open.forEach(function(fn) { fn(); });
			else if (open[socket.id]) open[socket.id]();
			return api;
		}
	}
}