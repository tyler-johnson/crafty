var _ = require("underscore");

var BOOL_PROPS = [ "generate-structures", "spawn-animals", "spawn-monsters", "spawn-npcs", "allow-flight", "allow-nether", "pvp" ],
	NUM_PROPS = [ "difficulty", "gamemode", "max-players" ];

module.exports = Ractive.extend({
	init: function() {
		this.set("props", $craft.props);

		this.on("save:enter", function() {
			this.findAll(".btn").forEach(function(btn) {
				btn.setAttribute("disabled", true);
				btn.classList.add("disabled");
			});

			this.find("button[type=\"submit\"]").innerHTML = "<i class=\"icon icon-cog icon-spin\"></i> Saving";
		});

		this.on("save:leave", function() {
			this.findAll(".btn").forEach(function(btn) {
				btn.removeAttribute("disabled");
				btn.classList.remove("disabled");
			});

			this.find("button[type=\"submit\"]").innerHTML = "Save";
		});

		this.on("submit", function(e) {
			if (e.original != null) e.original.preventDefault();
			var data = $(e.node).serializeObject();

			_.each(BOOL_PROPS, function(k) {
				if (_.isEmpty(data.game[k])) data.game[k] = false;
				else data.game[k] = true;
			});

			_.each(NUM_PROPS, function(k) {
				var val = parseFloat(data.game[k], 10);
				data.game[k] = isNaN(val) ? 0 : val;
			});

			// two level deep merge
			_.each(data, _.bind(function(val, key) {
				var cur = this.get("props." + key);

				if (_.isObject(val) && _.isObject(cur)) {
					val = _.extend({}, cur, val);
				}

				this.set("props." + key, val);
			}, this));

			// save props
			this.fire("save:enter");
			$craft.props.save().finally(this.fire.bind(this, "save:leave"));
		});

		this.on("save", function(e) {
			e.original.preventDefault();
			this.fire("submit", { node: this.find("form") });
		});

		this.on("save-restart", function(e) {});
	},
	el: "#main",
	append: true,
	twoway: false,
	template: require("../templates/settings"),
	data: {
		mcversions: app.minecraft_versions.slice(0).reverse()
	},
	adapt: [ 'Backbone' ]
});