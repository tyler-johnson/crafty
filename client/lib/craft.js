var Backbone = require("backbone"),
	_ = require("underscore"),
	Promise = require("bluebird"),
	Props = require("./props"),
	moment = require("moment"),
	util = require("./util");

module.exports = Craft;

function Craft(socket) {
	this.socket = socket;
	this.state = null;
	this.feed = [];

	var stateChange = _.bind(this._stateChange, this);
	socket.on("server:state", stateChange);
	util.asyncSocketEvent(socket, "server:state").then(stateChange);

	var self = this;
	
	[ "version", "data", "line", "eula" ].forEach(function(event) {
		socket.on("server:" + event, function() {
			var args = _.toArray(arguments);
			args.unshift(event);
			self.trigger.apply(self, args);
		});
	});

	this.on("data", function(data) {
		this.log(data, { time: false, newline: false });
	});

	this.on("eula", function() {
		if (confirm("In order to start a Minecraft Server, you must agree to Mojang's EULA (https://account.mojang.com/documents/minecraft_eula). Please click OK to confirm your agreement.")) {
			socket.emit("accept-eula", function() {
				self.log("EULA accepted. Restarting server...", { color: "blue" });
				self.start();
			});
		}
	});

	// Load props once on start up
	this.props = new Props(socket);
	this.props.fetch().then($app.wait());

	// Load old recent feed message
	var recent = util.storage.get("recentServerFeed");
	if (_.isArray(recent) && recent.length) this.feed.push.apply(this.feed, recent);
}

// eventful
Craft.prototype = Object.create(Backbone.Events);

Craft.prototype.start = function() {
	return util.asyncSocketEvent(this.socket, "server:start");
}

Craft.prototype.stop = function(n) {
	return util.asyncSocketEvent(this.socket, "server:stop", n);
}

Craft.prototype.restart = function() {
	return util.asyncSocketEvent(this.socket, "server:restart");
}

Craft.prototype.command = function() {
	var cmd = _.toArray(arguments).map(function(a) {
		return a == null ? "" : a.toString();
	}).join(" ");

	this.log("> " + cmd, {
		color: "green",
		time: false
	});

	return util.asyncSocketEvent(this.socket, "server:command", cmd);
}

Craft.prototype.log = function(str, options) {
	options = options || {};
	if (!_.isString(str)) str = str == null ? "" : str.toString();

	if (options.sanitize !== false) str = _.escape(str);
	if (options.time !== false) str = "[" + moment().format("HH:mm:ss") + "] " + str;
	if (options.newline !== false) str += "\n";
	if (options.color) str = "<span style='color: " + options.color + "'>" + str + "</span>";

	this._pushFeed(str);
	return this;
}

Craft.prototype.clearLog = function() {
	this.feed.splice(0, this.feed.length);
	util.storage.set("recentServerFeed", []);
	return this;
}

Craft.prototype._pushFeed = function(msg) {
	this.feed.push(msg);
	util.storage.set("recentServerFeed", this.feed.slice(-30));
	return this;
}

Craft.prototype._stateChange = function(state) {
	this.state = state;
	this.trigger("state", state);
}