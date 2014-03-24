var _ = require("underscore");

var BOOL_PROPS = [ "generate-structures", "spawn-animals", "spawn-monsters", "spawn-npcs", "allow-flight", "allow-nether", "pvp" ],
	NUM_PROPS = [ "difficulty", "gamemode", "max-players" ];

module.exports = View.TemplateView.extend({
	initialize: function() {

	},
	tagName: "form",
	className: "form-horizontal",
	template: require("../templates/settings"),
	events: {
		submit: function(e) {
			e.preventDefault();
			var data = $(e.target).serializeObject();

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
		}
	},
	actions: {
		save: function(e) {
			this.$el.submit();
		},
		"save-restart": function(e) {

		}
	}
});