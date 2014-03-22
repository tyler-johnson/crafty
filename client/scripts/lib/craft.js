var Events = require("backbone").Events,
	_ = require("underscore");

module.exports = (function() {

	function Craft() {
		this.state = null;

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
	}

	// eventful
	_.extend(Craft.prototype, Events);

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

	Craft.prototype.bindObject = function(obj, ns) {
		if (ns == null) ns = "craft";
		return Events.bindObject.call(this, obj, ns);
	}

	return Craft;

})();