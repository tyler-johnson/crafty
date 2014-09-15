var _ = require("underscore"),
	path = require("path"),
	Backbone = require("backbone"),
	Mustache = require("temple-mustache"),
	util = require("./util");

module.exports = Backbone.Router.extend({
	// init defers a call to start
	initialize: function() {
		this.state = "init";
		this.initTime = new Date; // date cache for the *rough* time of launch
		this.storage = util.storage(this.name);

		this._routeDep = new Mustache.Dependency;
		this.on("route", function() { this._routeDep.changed(); });

		 _.defer(this.wait());
	},

	// starts up the app
	start: function() {
		if (this.state === "error") {
			console.warn("App failed to initiate.");
		} else {
			console.log("App initiated successfully in " + (new Date - this.initTime) + "ms.");
			this.trigger(this.state = "ready"); // make it ready
		}

		delete this._wait_cnt; // clean
		this.start = function(){}; // prevent re-access
		return this; // chaining
	},

	// tell the app to wait on a async request
	wait: function(fn) {
		var self = this;
		if (_.isUndefined(this._wait_cnt)) this._wait_cnt = 0;
		this._wait_cnt++;

		return _.once(function() {
			self._wait_cnt--;
			if (_.isFunction(fn)) fn.apply(this, arguments);
			if (self._wait_cnt <= 0) self.start();
		});
	},

	// call a function now or on ready
	ready: function(fn) {
		if (this.state === "ready") fn.call(this);
		else this.once("ready", fn);
		return this; // chaining
	},

	// put app in an error state
	error: function(err) {
		this._lastError = err;

		if (this.state === "init") {
			console.info("Exception preventing startup:");
			console.error(err.stack);
			this.state = "error";
		} else {
			this.trigger("error", err);
		}

		return this; // chaining
	},

	route: function() {
		if (!arguments.length) {
			this._routeDep.depend();
			return "/" + _.compact(location.pathname.split("/")).join("/");
		}

		return Backbone.Router.prototype.route.apply(this, arguments);
	},

	setTitle: function(title) {
		document.querySelector("title").innerHTML = _.escape(title);
		return this;
	},

	_routeToRegExp: function(route) {
		if (route.substr(-3) !== "(/)") route += "(/)";
		return Backbone.Router.prototype._routeToRegExp.call(this, route);
	}
});