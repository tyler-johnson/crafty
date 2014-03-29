var _ = require("underscore");

module.exports = Ractive.extend({
	init: function() {
		this.set("feed", $craft.feed.slice(0));
		function onData(data) { this.get("feed").push(data); }
		$craft.on("data", onData, this);

		function onState(state) { this.set("state", state); }
		$craft.on("state", onState, this);

		this.on("teardown", function() {
			$craft.off("data", onData);
			$craft.off("data", onState);
		});

		this.observe("state", function(val) {
			var input = this.find("input");
			if (val !== "running") input.setAttribute("disabled", true);
			else input.removeAttribute("disabled");
		}, { defer: true });

		this.on("submit", function(e) {
			if (e.original.keyCode !== 13) return;
			var val = e.node.value.trim();
			if (_.isEmpty(val)) return;
			$craft.command(val);
			e.node.value = "";
		});
	},
	el: "#main",
	append: true,
	template: require("../templates/data-feed"),
	data: {
		state: $craft.state,
		feed: []
	}
});