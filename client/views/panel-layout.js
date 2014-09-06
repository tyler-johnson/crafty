

module.exports = View.extend({
	initialize: function() {
		this.use("backbone");

		this.on("render:after", function() {
			var bars = this.getComponents("sidebar");
			if (!bars.length) return;

			bars[0].on("stop", function() {
				console.trace();
			});
		});
	},
	template: require("../templates/panel-layout.html"),
	defaults: {
		tab: null,
		"tab:settings": function() { return this.get("tab") === "settings"; },
		"tab:console": function() { return this.get("tab") === "console"; },

		humanState: function() {
			return this.get("craft.state") === "running" ? "Online" : "Offline";
		},
		"state:stopped": function() { return this.get("craft.state") === "stopped"; },
		"state:starting": function() { return this.get("craft.state") === "starting"; },
		"state:running": function() { return this.get("craft.state") === "running"; },
		"state:stopping": function() { return this.get("craft.state") === "stopping"; },
	},
	partials: {
		sidebar: require("./server-info"),
		settings: require("./settings"),
		datafeed: require("./console")
	}
});