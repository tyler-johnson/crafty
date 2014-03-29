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
	Props = require("./props"),
	javaProps = require("properties-parser");

module.exports = Environment;

function Environment(dir, options) {
	if (!(this instanceof Environment))
		return new Environment(dir, options);

	this.options = _.defaults(options || {}, {
		version: _.last(VERSIONS),
		jar: "server_%v.jar"
	});

	this.dir = path.resolve(dir || ".");
	this.props = new Props();
	this.server();
}

// eventful
Environment.prototype = Object.create(EventEmitter.prototype);

Environment.prototype.init = function(cb) {
	return Promise.all([
		// install the server jar file
		this.server().exists().bind(this)
		.then(function(exists) {
			if (!exists) {
				return mkdirp(this.dir)
					.then(this.installServer.bind(this, null));
			}
		}),

		// meanwhile, load up server properties
		this.props.fetch()
	])
	.bind(this)
	.then(function() {
		this.emit("init");
	})
	.nodeify(cb);
}

Environment.prototype.resolve = function(file) {
	return path.resolve(this.dir, file);
}

Environment.prototype.installServer = function(version, cb) {
	if (_.isFunction(version) && cb == null) {
		cb = version;
		version = null;
	}

	if (version == null) version = this.options.version;

	this.emit("install:before");

	var filename = this.resolve(this.options.jar),
		url = Environment.serverUrl(version);

	return new Promise(function(resolve, reject) {
		http.get(url, onResponse).on('error', reject);

		function onResponse(res) {
			if (res.statusCode != 200)
				return reject(new Error("Non-200 status returned."));

			res.on("error", reject);
			res.on("end", resolve);
			res.pipe(fs.createWriteStream(filename));
		}
	})
	.bind(this)
	.then(function() {
		this.emit("install");
		this.emit("install:after");
	})
	.nodeify(cb);
}

Environment.serverUrl = function(version) {
	if (!_.contains(VERSIONS, version))
		throw new Error("Unsupported version '" + version + "'");

	return MC_URL.replace(/%v/g, version);
}

Environment.supported = VERSIONS;

Environment.prototype.server = function() {
	if (this._server != null) return this._server;
	var jar = this.resolve(this.options.jar);
	return this._server = new MCServer(jar, this.options);
}

// start up sequence
Environment.prototype.start = function(cb) {
	return this.props.saveAll()
		.bind(this)
		.then(function() {
			this.server().start();
		})
		.nodeify(cb);
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