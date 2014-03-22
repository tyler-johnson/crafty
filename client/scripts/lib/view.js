var _ = require("underscore"),
	Backbone = require("backbone");

var viewOptions = [ "actions", "template" ];

var View =
module.exports = Backbone.View.extend({

	constructor: function(options) {
		options || (options = {});
		_.extend(this, _.pick(options, viewOptions));
		Backbone.View.call(this, options);
	},

	delegateEvents: function() {
		Backbone.View.prototype.delegateEvents.apply(this, arguments);

		var els = this.$("[x-bind]"),
			defined = this.actions != null ? this.actions : {},
			id = this.cid,
			self = this;

		els.each(function() {
			var $el = $(this),
				events = actionsParse($el.attr("x-bind")),
				bound = $el.attr("x-bound"),
				atLeastOne = false;

			_.each(events, function(action, name) {
				var fn = defined[action];
				if (!_.isFunction(fn)) return;

				$el.on(name + ".delegateActions" + id, function(e) {
					if (_.contains(autoStopActions, name)) e.preventDefault();
					fn.apply(self, arguments);
				});

				atLeastOne = true;
			});

			if (atLeastOne) {
				if (bound == null) bound = [];
				else bound = _.compact(bound.split(","));
				bound.push(id);
				$el.attr("x-bound", _.unique(bound).join(","));
			}
		});

		return this;
	},

	undelegateEvents: function() {
		Backbone.View.prototype.undelegateEvents.apply(this, arguments);

		var id = this.cid,
			els = this.$("[x-bound]");
		
		els.each(function() {
			var $el = $(this),
				bound = _.compact($el.attr("x-bound").split(","));

			if (_.contains(bound, id)) {
				$el.off(".delegateActions" + id);
				bound = _.unique(_.without(bound, id));
				if (!bound.length) $el.removeAttr("x-bound");
				else $el.attr("x-bound", bound.join(","));
			}
		});

		return this;
	}

});

var autoStopActions = ["click","submit"];

function actionsParse(raw) {
	var parts = raw.split(";"),
		events = {};

	_.each(parts, function(p) {
		var m = p.match(/^([^:]+):(.*)$/i);
		if (m != null) events[m[1]] = m[2].trim();
	});

	return events;
}

View.TemplateView = View.extend({
	render: function(data) {
		if (!_.contains([ "function", "string" ], typeof this.template))
			throw new Error("Missing template.");

		this.$el.html(this.template(data));
		this.delegateEvents();
		this.trigger("render");
		return this;
	}
});