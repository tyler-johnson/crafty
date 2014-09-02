var _ = require("underscore"),
	Promise = require("bluebird");

exports.asyncSocketEvent = function(socket, event) {
	var args = _.toArray(arguments).slice(1);
	return new Promise(function(resolve) {
		args.push(resolve);
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