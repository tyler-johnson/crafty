var Events = require("backbone").Events,
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
	this.props = {};
	this._loadProps();
}

// eventful
Craft.prototype = Object.create(Events);

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

Craft.prototype.prop = function(key, val, cb) {
	if (val === void 0) return app.util.getProps(this.props, key);
	
	app.util.setProps(this.props, key, val);
	this.trigger("prop", key, val);
	return cb !== false ? this._writeProps().nodeify(cb) : true;
}

Craft.prototype._loadProps = function() {
	return app.util.asyncSocketEvent(socket, "props")
		.bind(this)
		.then(function(data) {
			this.prop(null, data, false);
		});
}

Craft.prototype._writeProps = function() {
	return app.util.asyncSocketEvent(socket, "props", this.props);
}