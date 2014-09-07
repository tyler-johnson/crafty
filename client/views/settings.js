var _ = require("underscore");

module.exports = View.extend({
	initialize: function() {
		this.use("twoway");
		this.use("actions");
		this.use("extras");
	},
	template: require("../templates/settings.html"),
	defaults: {
		mcversions: $app.minecraft_versions,
		motd_count: function() {
			var motd = this.get("craft.props.game.motd");
			return _.isString(motd) ? motd.length : 0;
		},
		saving: false,
		success: false,
		error: null,
		normal: function() {
			return this.get("craft.state") === "running" && !(this.get("success") || this.get("error"));
		}
	},
	actions: {
		save: function(e) {
			e.original.preventDefault();
			this.saveProps();
		},
		"save-restart": function(e) {
			e.original.preventDefault();
			this.saveProps().then(function() {
				this.get("craft").restart();
			});
		}
	},
	decorators: {
		disabled: function(el) {
			return { update: function(val) {
				el.disabled = !!val;
			} }
		}
	},
	saveProps: function() {
		this.set("saving", true);

		return this.get("craft.props").saveAll().delay(1000).bind(this).then(function() {
			this.set("saving", false);
			this.set("success", true).expire("success", 5000);
		}, function(err) {
			this.set("error", err.toString());
			throw err;
		});
	}
});