var _ = require("underscore");

module.exports = View.extend({
	initialize: function() {
		this.use("actions");
	},
	template: require("../templates/server-info.html"),
	defaults: {
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