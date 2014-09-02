var Promise = require("bluebird"),
	_ = require("underscore"),
	EventEmitter = require("events").EventEmitter,
	mkdirp = Promise.promisify(require("mkdirp")),
	path = require("path"),
	fs = Promise.promisifyAll(require("fs")),
	MCServer = require("./minecraft"),
	MCVersions = require("./versions"),
	Props = require("./props"),
	javaProps = require("properties-parser"),
	util = require("./util");

var default_opts = {
	jar: "server.jar"
}

function Environment(dir, options) {
	if (!(this instanceof Environment))
		return new Environment(dir, options);

	options = _.pick(options || {}, _.keys(default_opts));
	_.defaults(this, options, default_opts);

	this._init = false;
	this.directory = path.resolve(dir || ".");
	this.props = new Props();
	this.versions = new MCVersions({
		directory: this.resolve("versions")
	});
}

module.exports = Environment;

// eventful
Environment.prototype = Object.create(EventEmitter.prototype);

Environment.prototype.init = function() {
	if (this._init) return Promise.bind(this);

	// ensure the directory exists
	return mkdirp(this.directory).bind(this)

	// load up server properties
	.then(function() { return this.props.fetch(); })

	// init event
	.then(function() {
		this._init = true;
		this.emit("init");
	});
}

Environment.prototype.ready = function(cb) {
	var self = this;

	return new Promise(function(resolve) {
		if (!this._init) self.once("init", resolve);
		else resolve();
	}).bind(this).then(cb);
}

Environment.prototype.resolve = function(file) {
	return path.resolve(this.directory, file);
}

Environment.prototype.load = function(version) {
	if (version == null) version = _.last(MCVersions.supported);
	if (this._version === version) return Promise.bind(this);
	var file = this.resolve(this.jar);

	return this.unload()

	// load in the server file
	.then(function() {
		return this.versions.load(version, file);
	})

	// write all properties to disk
	.then(function() {
		return this.props.saveAll()
	})

	// new server instance
	.then(function() {
		this._version = version;
		var server = this._server = new MCServer(file);
		this.emit("load", server);
		return server;
	});
}

Environment.prototype.unload = function() {
	var file = this.resolve(this.jar);

	// stop the server if it is running
	return this.stop()

	// delete server file if it exists
	.then(function() { return util.fileExistsAsync(file) })
	.then(function(exists) { if (exists) return fs.unlinkAsync(file); })

	// reset properties
	.then(function() {
		var server = this._server;
		delete this._version;
		delete this._server;
		this.emit("unload", server);
	});
}

Environment.prototype.server = function() {
	return this._server || null;
}

// start up sequence
Environment.prototype.start = function() {
	// write all properties to disk
	return this.props.saveAll().bind(this)

	// start the server
	.then(function() { this.server().start(); });
}

Environment.prototype.stop = function(sec) {
	var server = this.server();
	if (server == null || server.isStopped()) return Promise.bind(this);
	var self = this;

	return new Promise(function(resolve, reject) {
		if (self._counting || _.isNaN(sec) || sec < 1) return resolve();
		self._counting = true;
		
		var countdown;
		(countdown = function () {
			if (sec > 0) {
				server.say("Server is shutting down in " + sec + "...");
				sec--;
				setTimeout(countdown, 1000);
			} else {
				self._counting = false;
				resolve();
			}
		})();
	})
	.bind(this)
	.then(function() {
		return new Promise(function(resolve, reject) {
			server.stop();
			server.once("exit", resolve);
		});
	});
}

Environment.prototype.acceptEULA = function() {
	return this.readFile("eula.txt").then(function(data) {
		data.some(function(line, index) {
			if (line === "eula=false") {
				data[index] = "eula=true";
				return true;
			}
		});

		return this.writeFile("eula.txt", data);
	});
}

Environment.prototype.readFile = function(name) {
	var filename = this.resolve(name);

	return new Promise(function(resolve, reject) {
		fs.exists(filename, resolve);
	})
	.bind(this)
	.then(function(exists) {
		if (!exists) return void 0;
		return fs.readFileAsync(filename, "utf-8")
			.then(function(data) {
				switch(path.extname(filename)) {
					case ".txt": return _.compact(data.split("\n"));
					case ".json": return JSON.parse(data);
					case ".properties":
						var props = javaProps.parse(data);
						_.each(props, function(val, key) {
							if (val.toLowerCase() === "true") props[key] = true;
							else if (val.toLowerCase() === "false") props[key] = false;
							else if (val.match(/^[0-9]+(?:\.[0-9]+)?$/i)) props[key] = parseFloat(val, 10);
						});
						return props;
				}
			});
	});
}

Environment.prototype.writeFile = function(name, data) {
	return Promise.try(function() {
		var filename = this.resolve(name);
		if (data == null) data = "";

		if (_.isObject(data)) {
			switch(path.extname(filename)) {
				case ".txt":
					data = data.join("\n");
					break;

				case ".json":
					data = JSON.stringify(data, null, "\t");
					break;

				case ".properties":
					var jp = javaProps.createEditor();
					_.each(data, function(val, key) {
						jp.set(key, val);
					});
					data = jp.toString();
					break;
			}
		}

		return fs.writeFileAsync(filename, data, { flag: "w" });
	}, null, this);
}


