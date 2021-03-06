var Backbone = require("backbone"),
	_ = require("underscore"),
	Promise = require("bluebird"),
	util = require("./util");

var Prop = Backbone.Model.extend({
	sync: sync,
	idAttribute: "_id"
});

var Props =
module.exports = Backbone.Collection.extend({
	constructor: function(socket, options) {
		this.socket = socket;
		Backbone.Collection.call(this, [], options);
	},
	sync: sync,
	model: Prop,
	saveAll: function(options) {
		return Promise.all(this.map(function(prop) {
			return prop.save(null, options);
		}));
	}
});

// a blank function
function noop(){}

function sync(method, model, options) {
	if (options == null) options = {};
	if (!_.isFunction(options.success)) options.success = noop;
	if (!_.isFunction(options.error)) options.error = noop;
	var socket = model.socket || model.collection.socket || $socket;

	var promise = Promise.try(function() {
		var id;

		switch(method) {
			case "read":
				if (model instanceof Prop) id = model.id;
				return socket.call("props:read", id)

			case "create":
				throw new Error("Cannot create.");

			case "update":
				id = model.id;
				return socket.call("props:write", id, model.toJSON());

			case "delete":
				throw new Error("Can't delete properties from the browser.");
		}

	});

	promise.then(options.success, options.error);
	model.trigger('request', model, promise, options);
	return promise;
}