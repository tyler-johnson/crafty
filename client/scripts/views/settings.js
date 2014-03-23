var _ = require("underscore");

module.exports = View.TemplateView.extend({
	initialize: function() {

	},
	tagName: "form",
	className: "form-horizontal",
	template: require("../templates/settings")
});