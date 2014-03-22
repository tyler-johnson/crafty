var _ = require("underscore");

module.exports = View.TemplateView.extend({
	initialize: function() {
		this.feed = [];

		// bindings
		$craft.bindObject(this);
		this.on("craft:data", this.push);
		this.on("craft:state", this.render);
	},
	template: require("../templates/data-feed.html"),
	render: function() {
		View.TemplateView.prototype.render.call(this, this.feed.join(""));
		this.code = this.$el.find("code");
		return this;
	},
	push: function(data) {
		if (this.code != null) this.code.append(data);
		return this.feed.push(data);
	},
	actions: {
		submit: function(e) {
			if (e.keyCode !== 13) return;
			
			var input = $(e.target),
				val = input.val().trim();
			
			if (_.isEmpty(val)) return;
			$craft.command(val);
			input.val("");
		}
	}
});