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

// general API
var propsAPI = clientAPI()
.on("accept-eula", function(done) {
	$env.acceptEULA().nodeify(done);
})
.on("props:read", function(id, done) {
	if (_.isFunction(id) && done == null) {
		done = id;
		id = null;
	}

	if (id == null) done(null, $env.props.toJSON());
	else {
		var prop = $env.props.get(id);
		done(null, prop != null ? prop.toJSON() : null);
	}
})
.on("props:write", function(id, data, done) {
	var prop = $env.props.get(id);
	
	if (prop == null)
		return done(new Error("No property set by that name exists."));

	expect(data).to.be.an("object");
	prop.set(data).save().return(prop.toJSON()).nodeify(done);
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
		fn(null, craft.state);
	})
	.on("server:start", function(fn) {
		$env.start().nodeify(fn);
	})
	.on("server:stop", function(sec, fn) {
		if (_.isFunction(sec) && fn == null) {
			fn = sec;
			sec = 0;
		}

		$env.stop(sec).nodeify(fn);
	})
	.on("server:restart", function(sec, fn) {
		$env.stop().delay(1000).then($env.start).nodeify(fn);
	})
	.on("server:command", function() {
		var args = _.toArray(arguments);
		done = args.pop();
		craft.command(args);
		done();
	})
	.connect(io.sockets);

	// next unload is this server instance
	$env.once("unload", function() {
		craftAPI.disconnect();
	});
});

function clientAPI() {
	var api,
		open = {},
		methods = [];

	return api = {
		on: function(name, fn) {
			methods.push([ name, function() {
				var args, done;

				try {
					args = _.toArray(arguments);
					done = noop;
					if (_.isFunction(_.last(args))) done = args.pop();

					args.push(function(err) {
						var args = _.toArray(arguments).slice(1);
						args.unshift(err != null ? err.toString() : null);
						done.apply(this, args);
					});

					fn.apply(this, args);
				} catch(e) {
					done(e.toString());
					console.error(e.stack);
				}
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