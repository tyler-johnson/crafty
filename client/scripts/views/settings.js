var _ = require("underscore");

var BOOL_PROPS = [ "generate-structures", "spawn-animals", "spawn-monsters", "spawn-npcs", "allow-flight", "allow-nether", "pvp" ],
	NUM_PROPS = [ "difficulty", "gamemode", "max-players" ];

module.exports = Ractive.extend({
	init: function() {
		this.on("submit", function(e) {
			if (e.original != null) e.original.preventDefault();
			var data = $(e.node).serializeObject();

			_.each(BOOL_PROPS, function(k) {
				if (_.isEmpty(data.game[k])) data.game[k] = false;
				else data.game[k] = true;
			});

			_.each(NUM_PROPS, function(k) {
				var val = parseFloat(data.game[k], 10);
				if (isNaN(val)) val = 0;
				data.game[k] = val;
			});

			console.log(data);
		});

		this.on("save", function(e) {
			e.original.preventDefault();
			this.fire("submit", { node: this.find("form") });
		});

		this.on("save-restart", function(e) {});
	},
	el: "#main",
	append: true,
	template: require("../templates/settings"),
	data: {
		mcversions: app.minecraft_versions.slice(0).reverse()
	}
});