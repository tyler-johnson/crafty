// Load global dependencies
window.jQuery = window.$ = require("jquery");
require("./lib/backbone").$ = jQuery;
require("./lib/bootstrap");
window.View = require("./lib/view");
window.socket = io.connect(location.origin);

// create a singleton Craft instance
var Craft = require("./lib/craft");
window.$craft = new Craft();

// and we're off
var page = require("page"),
	DataFeed = require("./views/data-feed");

page(function(ctx) {
	var feed = new DataFeed({ el: "#main" });
	feed.render();
});

$(document).ready(function() {
	var SidebarView = require("./views/sidebar"),
		sidebar, nav;

	sidebar = new SidebarView({ el: "#sidebar" });
	sidebar.render();

	// nav = new View.TemplateView({ el: "#nav", template: require("./templates/nav") })
	// nav.render();

	page();
});
