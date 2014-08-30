var MC_URL = "https://s3.amazonaws.com/Minecraft.Download/versions/%v/minecraft_server.%v.jar",
	VERSIONS = [ "1.7.4", "1.7.5" ];

var Promise = require("bluebird"),
	_ = require("underscore"),
	EventEmitter = require("events").EventEmitter,
	mkdirp = Promise.promisify(require("mkdirp")),
	path = require("path"),
	fs = Promise.promisifyAll(require("fs")),
	http = require("https"),
	MCServer = require("./minecraft"),
	MCVersions = require("./versions"),
	Props = require("./props"),
	javaProps = require("properties-parser");

var default_opts = {
	jar: "server.jar"
}

function Environment(dir, options) {
	if (!(this instanceof Environment))
		return new Environment(dir, options);

	options = _.pick(options || {}, _.keys(default_opts));
	_.defaults(this, options, default_opts);

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
	// ensure the directory exists
	return mkdirp(this.directory).bind(this)

	// load up server properties
	.then(function() { return this.props.fetch(); })

	// init event
	.then(function() { this.emit("init"); });
}

Environment.prototype.resolve = function(file) {
	return path.resolve(this.directory, file);
}

Environment.prototype.load = function(version) {
	if (this._version === version) return Promise.bind(this);
	var file = this.resolve(this.jar);

	return this.unload()

	// load in the server file
	.then(function() {
		return this.versions.load(version, file);
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
		delete this._version;
		delete this._server;
		this.emit("unload");
	});
}

Environment.prototype.server = function() {
	return this._server || null;
}

// start up sequence
Environment.prototype.start = function(version) {
	// load up the server file
	return this.load(version)

	// write all properties to disk
	.then(function() { return this.props.saveAll(); })

	// start the server
	.then(function() { this.server().start(); });
}

Environment.prototype.stop = function() {
	return new Promise(function(resolve, reject) {
		var server = this.server();
		if (server == null) return resolve();
		server.on("exit", resolve);
		server.stop();
	}).bind(this);
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
		if (_.isEmpty(data)) data = "";

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


