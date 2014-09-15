var io = require("socket.io-client")(location.origin),
	util = require("./util"),
	Promise = require("bluebird"),
	_ = require("underscore"),
	Mustache = require("temple-mustache");

var authDep = new Mustache.Dependency();

var socket =
module.exports = {
	io: io,
	
	_signedin: false,

	signedin: function() {
		authDep.depend();
		return socket._signedin;
	},
	
	signin: function(pass) {
		return socket.call("signin", pass).then(function(res) {
			if (!res) throw new Error("Invalid password!");
			$app.storage.set("password", pass);
			socket._signedin = true;
			authDep.changed();
			$app.trigger("signin");
		});
	},

	signout: function() {
		$app.storage.clear("password");
		socket._signedin = false;
		return socket.call("signout").finally(function() {
			authDep.changed();
			$app.trigger("signout");
		});
	},

	send: function(payload) {
		return asyncSocketEvent(io, "req", payload);
	},

	call: function(name) {
		return socket.apply(name, _.toArray(arguments).slice(1));
	},

	apply: function(name, args) {
		return socket.send({
			name: name,
			args: args
		});
	}
}

var lastId = null;

io.on("connect", function() {
	socket.signin($app.storage.get("password")).catch(function() {
		$app.storage.clear("password");
	});

	socket.call("server:id").then(function(id) {
		if (lastId == null) lastId = id;
		if (lastId !== id) location.reload();
	});
});

function asyncSocketEvent(socket, event) {
	var args = _.toArray(arguments).slice(1);
	
	return new Promise(function(resolve, reject) {
		args.push(function(err) {
			if (err != null) return reject(err);
			
			var args = _.toArray(arguments).slice(1),
				len = args.length;

			resolve(!len ? void 0 : len === 1 ? args[0] : args);
		});

		socket.emit.apply(socket, args);
	});
}