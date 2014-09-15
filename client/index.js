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

// load the app
var app = global.$app = new(require("./lib/app"));
_.extend(app, __app_runtime_variables__);

// Load socket io
var socket = global.$socket = require("./lib/socket");

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

var layout = global.$layout = new(require("./views/panel-layout"))(null, {
	app: app,
	craft: $craft
});

// launch routes on app start
app.ready(function() {
	layout.paint("body");
	Backbone.history.start({ pushState: true });
});

app.route("", function() {
	console.log("home");
});

app.route("settings", function() {
	if (!$socket.signedin()) return app.navigate("", { trigger: true });

	app.setTitle("Settings");
	layout.set("tab", "settings");
});

app.route("console", function() {
	if (!$socket.signedin()) return app.navigate("", { trigger: true });

	app.setTitle("Console");
	layout.set("tab", "console");
});