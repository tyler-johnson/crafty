var _ = require("underscore"),
	Events = require("backbone").Events,
	fs = require("fs"),
	path = require("path"),
	files = require("./files"),
	utils = require("./utils"),
	convict = require("convict"),
	Adaptor = require("./adaptor"),
	Promise = require("bluebird");

var schema = {
	title: {
		default: "My Minecraft Server",
		format: String
	},
	version: {
		default: "vanilla_1.8.1",
		format: String
	},
	savePath: {
		default: "settings.json",
		format: String,
		omit: true
	}
}

var omitKeys = Object.keys(schema).filter(function(key) {
	return _.has(schema, key) && schema[key].omit;
});

function Manager(dir, settings) {
	files.mkdirSync(this.directory = path.resolve(dir));
	this.settings = convict(schema);
	if (settings) this.settings.load(settings);
}

module.exports = Manager;

Manager.BINARY_DIR = "bin";
Manager.WORLD_DIR = "world";
Manager.ACTIVE_DIR = "active";

// load minecraft server-adaptor classes
var adaptors = Manager.adaptors = {};

fs.readdirSync(__dirname + "/adaptors").forEach(function(name) {
	var ext = path.extname(name);
	
	if (ext === ".js") {
		adaptors[path.basename(name, ext)] = require("./adaptors/" + name);
	}
});

function resolvePath() {
	var args = _.toArray(arguments);
	args.unshift(this.directory);
	return path.resolve.apply(path, args);
}

_.extend(Manager.prototype, Events, {

	resolvePath: resolvePath,
	resolveBinaryPath: _.partial(resolvePath, Manager.BINARY_DIR),
	resolveWorldPath:  _.partial(resolvePath, Manager.WORLD_DIR),
	resolveActivePath: _.partial(resolvePath, Manager.ACTIVE_DIR),

	setting: function(key, value) {
		if (arguments.length === 1) {
			return this.settings.has(key) ?
				this.settings.get(key) :
				void 0;
		}

		this.settings.set(key, value);
	},

	saveSettings: function() {
		var data = _.omit(this.settings.get(), omitKeys),
			settingsFile = this.resolvePath(this.settings.get("savePath"));

		return files.save(settingsFile, data).bind(this);
	},

	load: function() {
		var name = this.settings.get("version"),
			ctor = Manager.adaptors[name],
			adaptor;

		if (!(ctor === Adaptor || ctor.prototype instanceof Adaptor)) {
			throw new Error("Unkown version '" + name + "'.");
		}
		
		// always unload first
		return this.unload()

		.then(function() {
			// set new active adaptor
			adaptor = this.active = new ctor(this);

			// listen to all events
			adaptor.on("all", this._adaptorEvent, this);

			// make new active directory
			return files.mkdir(this.resolveActivePath());
		})

		// load adaptor
		.then(function() {
			return adaptor.load();
		});
	},

	unload: function() {
		if (!this.active) return Promise.bind(this);

		// unload adaptor
		return Promise.cast(this.active.unload()).bind(this)

		// clean up
		.then(function() {
			this.active.off("all", this._adaptorEvent);
			delete this.active;
		});
	},

	start: function() {
		if (!this.active) throw new Error("No active adaptor.");
		return Promise.cast(this.active.start()).bind(this);
	},

	stop: function() {
		if (!this.active) return Promise.bind(this);
		return Promise.cast(this.active.stop()).bind(this);
	},

	_adaptorEvent: function(name) {
		var args = _.toArray(arguments).slice(1);
		args.unshift("active:" + name);
		return this.trigger.apply(this, args);
	}

});