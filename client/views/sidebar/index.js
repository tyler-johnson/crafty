var _ = require("underscore");

module.exports = View.extend({
	initialize: function() {
		this.use("actions");
	},
	template: require("./layout.html"),
	defaults: {
		humanState: function() {
			return this.get("craft.state") === "running" ? "Online" : "Offline";
		},
		"state:stopped": function() { return this.get("craft.state") === "stopped"; },
		"state:starting": function() { return this.get("craft.state") === "starting"; },
		"state:running": function() { return this.get("craft.state") === "running"; },
		"state:stopping": function() { return this.get("craft.state") === "stopping"; },
		stopTime: null
	},
	actions: {
		start: function(e) {
			e.original.preventDefault();
			this.get("craft").start();
		},
		stop: function(e) {
			e.original.preventDefault();
			if (this.get("stopTime") != null) return;
			this.get("craft").stop(3);

			var cnt = 3,
				self = this,
				countdown;

			(countdown = function() {
				if (cnt > 0) {
					self.set("stopTime", cnt);
					cnt--;
					setTimeout(countdown, 1000);
				} else {
					self.unset("stopTime");
				}
			})();
		}
	}
});