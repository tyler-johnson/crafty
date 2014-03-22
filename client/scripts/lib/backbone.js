var _ = require("underscore"),
	Backbone = require("backbone");

Backbone.Events.bindObject = function(obj, ns) {
	if (ns == null) ns = "";
	else ns += ":";

	this.unbindObject(obj);

	obj.listenTo(this, "all", function() {
		var args = _.toArray(arguments);
		args[0] = ns + args[0];
		obj.trigger.apply(obj, args);
	});

	return this;
}

Backbone.Events.unbindObject = function(obj) {
	obj.stopListening(this, "all");
	return this;
}

module.exports = Backbone;