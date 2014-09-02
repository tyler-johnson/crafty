var _ = require("underscore"),
	Backbone = require("backbone"),
	url = require("url"),
	util = require("./lib/util");

// Load external libraries
global.jQuery = global.$ = require("jquery");
Backbone.$ = jQuery;
require("./lib/jquery_extras");
require("./lib/bootstrap");
global.View = require("temple-mustache");
require("temple-backbone");

// Load socket io
var socket = global.$socket = require("socket.io-client")(location.origin);

// load the app
var app = global.$app = new(require("./lib/app"));
_.extend(app, __app_runtime_variables__);

// create a singleton Craft instance
global.$craft = new(require("./lib/craft"))(socket);

// wait on the dom
$(document).ready(app.wait());

// intercept all clicks on anchors
window.addEventListener("click", function(e) {
	if (1 != util.which(e)) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey) return;
    if (e.defaultPrevented) return;

    // get anchor element
    var el = e.target;
    while (el && 'A' != el.nodeName) el = el.parentNode;
    if (!el || 'A' != el.nodeName) return;

    // parse the href
    var href = url.parse(el.getAttribute('href'));
    if (!_.isEmpty(href.host) && href.host !== location.host) return;

    // navigate to url
    e.preventDefault();
    app.navigate(href.pathname, { trigger: true });
});

var layout = global.$layout = new(require("./views/layout"))(null, {
	app: app,
	craft: $craft
});

// launch routes on app start
app.ready(function() {
	layout.paint("body");
	Backbone.history.start({ pushState: true });
});

app.route("", function() {
	app.navigate("settings", { trigger: true, replace: true });
});

app.route("settings", function() {
	app.setTitle("Settings");
	layout.set("tab", "settings");
});

app.route("console", function() {
	app.setTitle("Console");
	layout.set("tab", "console");
});

/*// load nav
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
*/