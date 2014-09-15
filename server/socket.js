// Dependencies
var _ = require("underscore"),
	fs = require("fs"),
	Promise = require("bluebird"),
	IONamespace = require('socket.io/lib/namespace'),
	expect = require("expect.js"),
	crypto = require("crypto");

function noop(){}

var instanceId = crypto.randomBytes(12).toString("hex");

// the socket.io server
var io =
module.exports = require('socket.io').listen($server, {
	serveClient: false
});

// general API
var router = createSocketRouter()
.on("server:id", function(done) {
	done(null, instanceId);
})
.on("signin", function(password, done) {
	var pass = $env.props.get("server").get("password");
	done(null, this.socket.signedin = pass == null || password === pass);
})
.on("signout", function(done) {
	delete this.socket.signedin;
	done(null);
})
.on("signedin", function(done) {
	done(null, this.socket.signedin || false);
})
.use(function(req, next) {
	if (!req.socket.signedin) return next();
	secureRouter(req, next);
})
.connect(io.sockets);

// password protected routes
var secureRouter = createSocketRouter()
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
});

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
		craft.on(event, function() {
			var args = _.toArray(arguments);
			args.unshift("server:" + event);

			io.sockets.forEach(function(socket) {
				if (socket.signedin) socket.emit.apply(socket, args);
			});
		});
	});

	router.on("server:state", function(done) {
		done(null, craft.state);
	});

	var craftAPI = createSocketRouter()
	.attach(secureRouter)
	.on("server:start", function(done) {
		$env.start().nodeify(done);
	})
	.on("server:stop", function(sec, done) {
		if (_.isFunction(sec) && done == null) {
			done = sec;
			sec = 0;
		}

		$env.stop(sec).nodeify(done);
	})
	.on("server:restart", function(sec, done) {
		$env.stop().delay(1000).then($env.start).nodeify(done);
	})
	.on("server:command", function() {
		var args = _.toArray(arguments);
		done = args.pop();
		craft.command(args);
		done();
	});

	// next unload is this server instance
	$env.once("unload", function() {
		secureRouter.remove(craftAPI);
	});
});

function createSocketRouter() {
	var api,
		open = {},
		middleware = [];

	function socketEvent(payload, done) {
		if (!_.isObject(payload)) return;
		if (!_.isFunction(done)) done = noop;
		payload.socket = this;
		router.call(this, payload, done);
	}

	function router(payload, done) {
		var methods, next, self;

		methods = middleware.slice(0);
		self = this;

		(next = function() {
			var args = _.toArray(arguments);

			if (args.length || !methods.length) {
				if (args[0] instanceof Error) {
					if (_.isString(args[0].message)) args[0] = args[0].message;
					else args[0] = args[0].toString();
				}

				return done.apply(self, args);
			}

			try {
				methods.shift().call(self, payload, next);
			} catch(e) {
				next(e);
			}
		})();
	}

	_.extend(router, {
		use: function(fn) {
			middleware.push(fn);
			return router;
		},

		remove: function(fn) {
			middleware = _.without(middleware, fn);
			return router;
		},

		on: function(name, fn) {
			router.use(function(req, next) {
				if (req.name !== name) return next();
				var args = _.isArray(req.args) ? req.args : [];
				fn.apply(req, args.concat(next));
			});

			return router;
		},

		attach: function(r) {
			r.use(router);
			return router;
		},

		connect: function(socket) {
			if (socket instanceof IONamespace) {
				_.each(socket.sockets, router.connect);
				socket.on('connection', router.connect);
				return router;
			}

			router.disconnect(socket);

			socket.on("req", socketEvent);
			socket.on("disconnect", open[socket.id] = function() {
				socket.removeListener("req", socketEvent);
				socket.removeListener("disconnect", open[socket.id]);
				delete open[socket.id];
			});

			return router;
		},

		disconnect: function(socket) {
			if (socket == null) _.keys(open).forEach(function(id) { open[id](); });
			else if (open[socket.id]) open[socket.id]();
			return router;
		}
	});

	return router;
}