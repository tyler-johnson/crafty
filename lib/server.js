// Constants
var JAVA_PATH = "java",
	PATTERNS = {
		version: /^Starting minecraft server version ([.0-9a-zA-Z]+)$/,
		done:    /^Done \([.0-9a-zA-Z]+\)!/,
		join:    /^(\w+) ?(?:\[(.+)\] )?logged in with entity id (\d+) at \(([\d\s\-\.,]+)\)$/,
		leave:   /^(\w+) lost connection: (.+)$/,
		bind:    /^\*+ FAILED TO BIND TO PORT\!$/
	};

// Dependencies
var exec = require("child_process").exec,
	_ = require("underscore"),
	EventEmitter = require("events").EventEmitter,
	Promise = require("bluebird"),
	path = require('path'),
	fs = Promise.promisifyAll(require("fs")),
	moment = require('moment');

// Minecraft Server
module.exports = (function() {

	function MCServer(jar, options) {
		if (!(this instanceof MCServer))
			return new MCServer(jar, options);
		
		this.jar = jar;
		this.process = null;
		this.state = "stopped";
		this.options = options || {};
		this.players = {};
	}

	// eventful
	_.extend(MCServer.prototype, EventEmitter.prototype);

	MCServer.command = function(jar, ram) {
		if (ram == null) ram = "1G";

		return [
			JAVA_PATH,
			"-jar",
			"-Xms" + ram,
			"-Xmx" + ram,
			jar,
			"nogui"
		].join(" ");
	}

	MCServer.prototype.exists = function() {
		var jar = this.jar;
		return new Promise(function(resolve) {
			fs.exists(jar, resolve);
		});
	}

	MCServer.prototype.start = function() {
		if (this.process != null ||
			this.state == "starting" ||
			this.state == "ready") return false;

		this.state = "starting";
		this.emit("start");

		var cmd = MCServer.command(this.jar, this.options.ram);
		this.process = exec(cmd, {
			cwd: path.dirname(this.jar),
			killSignal: 'SIGINT'
		});

		this.process.stdout.on("data", _.bind(this._onData, this));
		this.process.stderr.on("data", _.bind(this._onError, this));
		this.process.once("exit", _.bind(this._onExit, this));

		return true;
	}

	MCServer.prototype.stop = function() {
		if (this.process == null ||
			this.state == "stopping" ||
			this.state == "stopped") return false;
		
		this.state = "stopping";
		_.keys(this.players).forEach(this._playerLeft.bind(this));
		this.players = {};

		// command last to guarantee state order
		this.emit("stop");
		this.command("stop");
		
		return true;
	}

	MCServer.prototype.ready = function(fn) {
		if (this.state === "running") fn.call(this);
		else this.once("ready", fn);
		return this;
	}

	MCServer.prototype.restart = function() {
		if (this.stop()) this.once("exit", this.start);
		else this.start();
		return this;
	}

	MCServer.prototype.command = function() {
		if (this.process != null) {
			var cmd = _.toArray(arguments).join(" ") + "\n";
			this.process.stdin.write(cmd);
		}

		return this;
	}

	MCServer.prototype.say = function(msg) {
		return this.command("say", msg);
	}

	MCServer.prototype.isOnline = function(name) {
		return this.players.hasOwnProperty(name);
	}

	MCServer.prototype.getPlayer = function(name) {
		return this.players[name];
	}

	MCServer.prototype._onData = function(data) {
		this.emit("data", data);

		var line = MCServer.parseLine(data);
		if (line == null) return;
		this.emit("line", line);

		_.some(PATTERNS, _.bind(function(reg, key) {
			var m = reg.exec(line.text);
			if (m == null) return;
			
			switch(key) {
				case "version":
					this.emit("version", m[1]);
					break;

				case "done":
					this.state = "running";
					this.emit("ready");
					break;

				case "join":
					var meta, name = m[1], host = m[2],
						pos = m[4].split(",").map(function(p) {
							return parseFloat(p.trim());
						});

					meta = {
						name: name,
						host: host[0] === "/" ? host.substr(1) : host,
						id: m[3],
						position: pos
					}
					
					this.players[name] = meta;
					this.emit("join", name, meta);
					break;

				case "leave":
					this._playerLeft(m[1]);
					break;

				case "bind":
					this.emit("error", new Error("Failed to bind port."));
					break;
			}

			return true;
		}, this));
	}

	MCServer.prototype._onError = function(data) {
		if (/^Error/.test(data) || /^Exception/.test(data)) {
			this.emit("error", new Error(data));
		} else {
			this.emit("data", data);
		}
	}

	MCServer.prototype._onExit = function() {
		this.process = null;
		this.state = "stopped";
		this.emit("exit");
	}

	MCServer.prototype._playerLeft = function(name) {
		if (this.isOnline(name)) {
			delete this.players[name];
			this.emit("leave", name);
		}
	}

	MCServer.parseLine = function (line) {
		var match = line.match(/^\[([0-9\:]+)\] \[([^\]]+)\]: (.*)/i);
		if (match == null) return;

		var ref = match[2].split("/");

		return {
			date:  moment(match[1], "HH:mm:ss").toDate(),
			from:  ref[0],
			level: ref[1] == null ? "" : ref[1],
			text:  match[3]
		};
	}

	return MCServer;

})();