var _ = require("underscore"),
	Promise = require("bluebird");

exports.asyncSocketEvent = function(socket, event) {
	var args = _.toArray(arguments).slice(1);
	
	return new Promise(function(resolve, reject) {
		args.push(function(err) {
			if (err) return reject(err);
			
			var args = _.toArray(arguments).slice(1),
				len = args.length;

			resolve(!len ? void 0 : len === 1 ? args[0] : args);
		});

		socket.emit.apply(socket, args);
	});
}

exports.which = function(e) {
	e = e || window.event;
	return null == e.which
		? e.button
		: e.which;
}

var stor =
exports.storage = {
	supported: window.localStorage != null,
	get: function(key) {
		if (!stor.supported) return;
		var raw = window.localStorage[key];
		return raw != null ? JSON.parse(raw) : void 0;
	},
	set: function(key, value) {
		if (!stor.supported) return;
		window.localStorage[key] = JSON.stringify(value);
	}
}