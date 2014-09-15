var _ = require("underscore");

exports.which = function(e) {
	e = e || window.event;
	return null == e.which
		? e.button
		: e.which;
}

var Storage =
exports.storage = function(namespace) {
	var stor;

	return stor = {
		namespace: namespace,
		key: function(k) {
			return (_.isEmpty(stor.namespace) ? "" : stor.namespace + ":") + k;
		},
		get: function(k) {
			try {
				if (!Storage.supported) return;
				return JSON.parse(atob(window.localStorage[stor.key(k)]));
			} catch(e) {
				return void 0;
			}
		},
		set: function(k, value) {
			if (!Storage.supported) return;
			window.localStorage[stor.key(k)] = btoa(JSON.stringify(value));
		},
		clear: function(k) {
			if (!Storage.supported) return;
			delete window.localStorage[stor.key(k)];
		}
	}
}

exports.storage.supported = window.localStorage != null;