

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
	template: require("./layout.html"),
	defaults: {
		tab: null,
		"tab:settings": function() { return this.get("tab") === "settings"; },
		"tab:console": function() { return this.get("tab") === "console"; }
	},
	partials: {
		sidebar: require("../sidebar"),
		settings: require("../settings"),
		datafeed: require("../data-feed")
	}
});