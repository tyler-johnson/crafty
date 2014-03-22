var MC_URL = "https://s3.amazonaws.com/Minecraft.Download/versions/%v/minecraft_server.%v.jar",
	VERSIONS = [ "1.7.5" ];

var Promise = require("bluebird"),
	_ = require("underscore"),
	EventEmitter = require("events").EventEmitter,
	mkdirp = Promise.promisify(require("mkdirp")),
	path = require("path"),
	fs = Promise.promisifyAll(require("fs")),
	http = require("https"),
	MCServer = require("./server");

module.exports = Environment;

function Environment(dir, options) {
	if (!(this instanceof Environment))
		return new Environment(dir, options);

	this.options = _.defaults(options || {}, {
		version: "1.7.5",
		jar: "server.jar"
	});

	this.dir = path.resolve(dir);
	this.server();
}

// eventful
_.extend(Environment.prototype, EventEmitter.prototype);

Environment.prototype.init = function(cb) {
	return this.server().exists()
		.bind(this)
		.then(function(exists) {
			if (!exists) {
				return mkdirp(this.dir)
					.then(this.installServer.bind(this, null));
			}
		})
		.then(function() {
			this.emit("init");
		});
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