var Backbone = require("backbone"),
	_ = require("underscore"),
	Promise = require("bluebird");

module.exports = Craft;

function Craft() {
	this.state = null;
	this.feed = [];

	var stateChange = _.bind(this._stateChange, this);
	this.listenTo(socket, "server:stateChange", stateChange);
	socket.emit("server:state", stateChange);

	var listenTo = [ "version", "data", "line" ],
		self = this;
	
	_.each(listenTo, function(event) {
		self.listenTo(socket, "server:" + event, function() {
			var args = _.toArray(arguments);
			args.unshift(event);
			self.trigger.apply(self, args);
		});
	});

	this.on("data", function(data) {
		this.feed.push(data);
	});

	// Load props once on start up
	this.props = new Properties();
}

// eventful
Craft.prototype = Object.create(Backbone.Events);

Craft.prototype.start = function() {
	socket.emit("server:start");
}

Craft.prototype.stop = function(n) {
	socket.emit("server:stop", n);
}

Craft.prototype.command = function() {
	var args = _.toArray(arguments);
	args.unshift("server:command");
	socket.emit.apply(socket, args);
}

Craft.prototype._stateChange = function(state) {
	this.state = state;
	this.trigger("state", state);
}

// server properties
var Properties = Backbone.Model.extend({
	initialize: function() {
		this.listenTo(socket, "props", this.set.bind(this));
		this.listenTo(socket, "reconnect", this.fetch.bind(this, null));
		this.fetch();
	},
	isNew: function() {
		return false;
	},
	sync: function(method, model, options) {
		if (options == null) options = {};
		if (!_.isFunction(options.success)) options.success = noop;
		if (!_.isFunction(options.error)) options.error = noop;

		var promise = new Promise(function(resolve, reject) {
			switch (method) {
				case "read":
					socket.emit("props", resolve);
					break;

				case "create":
					reject(new Error("Cannot create props."));
					break;

				case "update":
					socket.emit("props", model.toJSON(), resolve);
					break

				case "delete":
					reject(new Error("Cannot delete props."));
					break;
			}
		});

		promise.then(options.success, options.error);
		model.trigger('request', model, promise, options);
		return promise;
	}
});

function noop(){}