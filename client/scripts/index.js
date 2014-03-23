// Load global dependencies
window.app = require("./lib/app");
window.jQuery = window.$ = require("jquery");
require("./lib/backbone").$ = jQuery;
require("./lib/bootstrap");
window.View = require("./lib/view");
window.socket = io.connect(location.origin);
require("./lib/router");

// create a singleton Craft instance
var Craft = require("./lib/craft");
window.$craft = new Craft();

// wait on the dom
$(document).ready(app.wait());

// load nav
var nav;
app.preroute(function(ctx, next) {
	if (nav == null) {
		nav = new View.TemplateView({
			el: "#nav",
			template: require("./templates/nav")
		});
	}

	nav.render(ctx);
	next();
});

// console route
app.route("/console", function(ctx) {
	var DataFeed = require("./views/data-feed"),
		view = new DataFeed();

	$("#main").html(view.$el);
	view.render();
	ctx.on("close", view.close, view);
});

// settings route
app.route("/settings", function(ctx) {
	var SettingsView = require("./views/settings"),
		view = new SettingsView();

	$("#main").html(view.$el);
	view.render();
	ctx.on("close", view.close, view);
});

// load sidebar on start
app.ready(function() {
	var sidebar = new (require("./views/sidebar"))();
	$("#sidebar").append(sidebar.$el);
	sidebar.render();
});
