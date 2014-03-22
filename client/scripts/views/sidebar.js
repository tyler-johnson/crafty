var _ = require("underscore"),
	Backbone = require("backbone");

module.exports = View.extend({
	initialize: function() {
		// bindings
		$craft.bindObject(this);
		this.on("craft:state", this.render);
	},
	template: require("../templates/info"),
	render: function() {
		this.$el.html(this.template());
		this.delegateEvents();
		return this;
	},
	actions: {
		start: function(e) {
			e.preventDefault();
			$craft.start();
		},
		stop: function(e) {
			if (this.stopInterval != null) return;

			var cnt = 3, i,
				el = $(e.currentTarget);

			e.preventDefault();
			$craft.stop(cnt);
			el.addClass("disabled").text("in " + cnt + "...");

			this.stopInterval =
			i = setInterval(_.bind(function() {
				cnt--;
				if (cnt > 0) el.text("in " + cnt + "...");
				else {
					clearInterval(i);
					this.stopInterval = null;
				}
			}, this), 1000);
		}
	}
});