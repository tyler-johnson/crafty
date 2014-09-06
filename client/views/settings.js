var _ = require("underscore");

module.exports = View.extend({
	initialize: function() {
		this.use("twoway");
		this.use("actions");
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

		return this.get("craft.props").saveAll().bind(this).then(function() {
			this.set("saving", false);
			this.set("success", true).expire("success", 5000);
		}, function(err) {
			this.set("error", err.toString());
			throw err;
		});
	},
	expire: function(path, ttl) {
		var model = this.get(path, { model: true, depend: false }),
			self = this;
		
		if (this._ttl == null) this._ttl = {};

		// clear existing ttl
		if (_.has(this._ttl, path)) {
			clearTimeout(this._ttl[path]);
			delete this._ttl[path];
		}

		// do nothing if ttl isn't a number
		if (!_.isNumber(ttl) || _.isNaN(ttl) || ttl < 0) return this;

		// set the timeout
		this._ttl[path] = setTimeout(function() {
			self.unset(path);
			delete self._ttl[path];
		}, ttl);

		return this;
	}
});