// Load global dependencies
window.app = require("./lib/app");
window.jQuery = window.$ = require("jquery");
require("./lib/jquery_extras");
require("./lib/backbone").$ = jQuery;
require("./lib/bootstrap");
// window.View = require("./lib/view");
window.socket = io.connect(location.origin);
require("./lib/router");
require("Ractive"); // ractive is global apparently

// create a singleton Craft instance
var Craft = require("./lib/craft");
window.$craft = new Craft();

// wait on the dom
$(document).ready(app.wait());

// load nav
var nav;
app.preroute(function(ctx, next) {
	if (nav == null) {
		nav = new Ractive({
			el: "#nav",
			template: require("./templates/nav"),
			data: {
				active: function(path) {
				    return this.get("pathname") === path ? " active" : "";
				}
			}
		});
	}

	nav.set("pathname", ctx.pathname);
	next();
});

// console route
app.route("/console", function(ctx) {
	var view = new (require("./views/data-feed"))();
	ctx.on("close", view.teardown, view);
});

// settings route
app.route("/settings", function(ctx) {
	var view = new (require("./views/settings"))();
	ctx.on("close", view.teardown, view);
});

// load sidebar on start
app.ready(function() {
	require("./views/sidebar");
});
