var _ = require("underscore"),
	Backbone = require("backbone"),
	utils = require("./utils");

function Adaptor(manager) {
	this.manager = manager;
}

module.exports = Adaptor;
Adaptor.extend = Backbone.Model.extend;

_.extend(Adaptor.prototype, Backbone.Events, {

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