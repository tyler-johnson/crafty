var _ = require("underscore"),
	Backbone = require("backbone");

Backbone.Events.bindObject = function(obj, ns) {
	if (ns == null) ns = "";
	else ns += ":";

	this.unbindObject(obj);

	this.listenTo(obj, "all", _.bind(function() {
		var args = _.toArray(arguments);
		args[0] = ns + args[0];
		this.trigger.apply(this, args);
	}, this));

	return this;
}

Backbone.Events.unbindObject = function(obj) {
	this.stopListening(obj, "all");
	return this;
}

module.exports = Backbone;