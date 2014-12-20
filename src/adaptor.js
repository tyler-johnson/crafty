var _ = require("underscore"),
	EventEmitter = require("events").EventEmitter,
	utils = require("./utils");

function Adaptor(manager) {
	this.manager = manager;
}

module.exports = Adaptor;
Adaptor.prototype = Object.create(EventEmitter.prototype);
Adaptor.extend = utils.subclass;

_.extend(Adaptor.prototype, {

	load: function() {},
	unload: function() {},

	// one of: stopped, starting, running, stopping
	readyState: "stopped",

	isRunning: function() {
		return
			this.readyState == "starting" ||
			this.readyState == "ready";
	},

	isStopped: function() {
		return
			this.readyState == "stopping" ||
			this.readyState == "stopped";
	},

	start: function() {},
	stop: function() {}

});