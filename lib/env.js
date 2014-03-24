var MC_URL = "https://s3.amazonaws.com/Minecraft.Download/versions/%v/minecraft_server.%v.jar",
	VERSIONS = [ "1.7.4", "1.7.5" ],
	RUNTIME_FILES = {
		// "banned": "banned-players.txt",
		"ops": "ops.txt",
		"whitelist": "white-list.txt",
		"game": "server.properties"
	},
	DEFAULT_PROPS = {
		"ops": [],
		"whitelist": [],
		"game": {
			"generator-settings": "",
			"op-permission-level": 4,
			"allow-nether": true,
			"level-name": "world",
			"enable-query": false,
			"allow-flight": false,
			"announce-player-achievements": true,
			"server-port": 25565,
			"level-type": "DEFAULT",
			"enable-rcon": false,
			"force-gamemode": false,
			"level-seed": "",
			"server-ip": "",
			"max-build-height": 256,
			"spawn-npcs": true,
			"white-list": false,
			"spawn-animals": true,
			"snooper-enabled": true,
			"hardcore": false,
			"online-mode": true,
			"resource-pack": "",
			"pvp": true,
			"difficulty": 1,
			"enable-command-block": false,
			"player-idle-timeout": 0,
			"gamemode": 0,
			"max-players": 20,
			"spawn-monsters": true,
			"view-distance": 10,
			"generate-structures": true,
			"motd": "A Minecraft Server"
		}
	};

var Promise = require("bluebird"),
	_ = require("underscore"),
	EventEmitter = require("events").EventEmitter,
	mkdirp = Promise.promisify(require("mkdirp")),
	path = require("path"),
	fs = Promise.promisifyAll(require("fs")),
	http = require("https"),
	MCServer = require("./server"),
	javaProps = require("properties-parser");

module.exports = Environment;

function Environment(dir, options) {
	if (!(this instanceof Environment))
		return new Environment(dir, options);

	this.options = _.defaults(options || {}, {
		version: _.last(VERSIONS),
		jar: "server.jar",
		propfile: "minecraft.json"
	});

	this.dir = path.resolve(dir || ".");
	this.props = {};
	this.server();
}

// eventful
_.extend(Environment.prototype, EventEmitter.prototype);

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

		// load up server properties
		this._loadProps()
			.then(this.mergeRuntime)
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

Environment.prototype._readFile = function(name) {
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

Environment.prototype._writeFile = function(name, data) {
	var filename = this.resolve(name);

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

	return fs.writeFileAsync(filename, data).bind(this);
}

Environment.prototype.prop = function(keys, val, cb) {
	if (keys == null) {
		if (val == null) return this.props;
		
		// single deep copy
		_.each(val, _.bind(function(v, k) {
			this.prop(k, v, false);
		},this));
	} else {
		var parts = keys.split("."),
			last = parts.pop(),
			hasValue = val !== void 0,
			current = this.props,
			key;

		while (parts.length) {
			key = parts.shift();

			if (typeof current[key] !== "object") {
				if (hasValue) current[key] = {};
				else return void 0;
			}

			current = current[key];
		}

		if (!hasValue) return current[last];
		else current[last] = val;
	}

	this.emit("prop", keys, val);
	return cb !== false ? this._writeProps().nodeify(cb) : true;
}

Environment.prototype._loadProps = function() {
	return this._readFile(this.options.propfile)
		.then(function(data) {
			this.props = data != null ? data : {};
			_.defaults(this.props, DEFAULT_PROPS);
		});
}

Environment.prototype._writeProps = function() {
	return this._writeFile(this.options.propfile, this.props);
}

// captures content of mc server runtime files,
// merges it with props and then writes the
// result back to the files
Environment.prototype.mergeRuntime = function() {
	var promises = {},
		self = this;

	_.each(RUNTIME_FILES, function(file, key) {
		promises[key] = self._readFile(file);
	});

	return Promise.props(promises)
		.bind(this)
		.then(function(props) {
			_.each(props, function(data, key) {
				var current = self.prop(key);

				if (_.isArray(data)) {
					if (!_.isArray(current)) current = [];
					self.prop(key, _.unique(current.concat(data)), false);
				} else if (_.isObject(data)) {
					if (!_.isObject(current)) current = {};
					self.prop(key, _.extend({}, data, current), false);
				}
			});
		})
		.then(function() {
			return Promise.all(_.map(RUNTIME_FILES, function(file, key) {
				return self._writeFile(file, self.prop(key));
			}));
		});
}