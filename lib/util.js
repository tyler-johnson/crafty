// This file is shared between the client and the server
var _ = require("underscore"),
	Promise = require("bluebird");

var namespace =
exports.namespace = function(obj, key, val) {
	var parts = key.split("."),
		last = parts.pop(),
		hasValue = val !== void 0,
		current = obj,
		part;

	while (parts.length) {
		part = parts.shift();

		if (typeof current[part] !== "object") {
			if (hasValue) current[part] = {};
			else return void 0;
		}

		current = current[part];
	}

	if (!hasValue) return current[last];
	else current[last] = val;
}

exports.getProps = function(props, key) {
	if (key == null) return props;
	else return namespace(props, key);
}

var setProps =
exports.setProps = function(props, key, val) {
	if (key == null) {
		if (_.isObject(val)) {
			// single level deep copy via recursion
			_.each(val, function(v, k) {
				setProps(props, k, v);
			});
		}
	} else {
		// redudant? no, because it captures undefined too
		if (val == null) val = null;
		namespace(props, key, val);
	}
}

exports.asyncSocketEvent = function(socket, event) {
	var args = _.toArray(arguments).slice(1);
	return new Promise(function(resolve) {
		args.push(resolve);
		socket.emit.apply(socket, args);
	});
}