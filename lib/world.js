// Dependencies
var _ = require("underscore"),
	EventEmitter = require("events").EventEmitter,
	Promise = require("bluebird"),
	fs = Promise.promisifyAll(require("fs")),
	path = require("path"),
	zlib = require("zlib"),
	nbt = require("nbt");

// Minecraft World Reader
module.exports = (function() {

	function World(dir, options) {
		if (!(this instanceof World))
			return new World(dir, options);

		this.dir = dir;

		if (!fs.existsSync(this.resolve("level.dat")))
			throw new Error("'" + dir + "' is not a world folder.");
	}

	// eventful
	_.extend(World.prototype, EventEmitter.prototype);

	// parse data files
	World.parseDAT = function(raw) {
		return new Promise(function(resolve, reject) {
				zlib.gunzip(raw, function(err, data) {
					if (err) reject(err);
					else resolve(data);
				});
			})
			.then(function(data) {
				data = nbt.parse(data);
				if (data[""] != null) return data[""];
				else return data;
			});
	}

	World.prototype.resolve = function(file) {
		return path.resolve(this.dir, file);
	}
	
	World.prototype.load = function(file, cb) {
		var filename = this.resolve(file),
			type = path.extname(file),
			promise = fs.readFileAsync(filename).bind(this);

		switch (type) {
			case ".dat":
				promise = promise.then(World.parseDAT);
				break;

			case ".json":
				promise = promise.then(JSON.parse);
				break;
				
			default:
				throw new Error("Unknown file type '" + type + "'");
		}

		return promise.nodeify(cb);
	}

	// actual api
	World.prototype.level = function(cb) {
		return this.load("level.dat", cb);
	}

	World.prototype.playerNames = function(cb) {
		return fs.readdirAsync(this.resolve("players"))
			.bind(this)
			.then(function(names) {
				return names
					.filter(function(n) { return n.substr(-4) === ".dat"; })
					.map(function(n) { return n.substr(0, n.length - 4); });
			})
			.nodeify(cb);
	}

	World.prototype.player = function(name, cb) {
		return this.load("players/" + name + ".dat", cb);
	}

	World.prototype.players = function(cb) {
		return this.playerNames()
			.then(function(names) {
				var players = {},
					self = this;

				names.forEach(function(n) {
					players[n] = self.player(n);
				});

				return Promise.props(players);
			})
			.nodeify(cb);
	}

	return World;

})();