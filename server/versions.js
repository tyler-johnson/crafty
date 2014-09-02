var MC_URL = "https://s3.amazonaws.com/Minecraft.Download/versions/%v/minecraft_server.%v.jar",
	MC_VERSIONS = [ "1.7.10" ];

var _ = require("underscore"),
	Promise = require("bluebird"),
	path = require("path"),
	mkdirp = Promise.promisify(require("mkdirp")),
	fs = require("fs"),
	http = require("https"),
	util = require("./util");

var default_opts = {
	directory: "versions",
	filename: "server_%v.jar"
}

function MCVersionManager(options) {
	options = _.pick(options || {}, _.keys(default_opts));
	_.defaults(this, options, default_opts);
}

module.exports = MCVersionManager;
MCVersionManager.supported = MC_VERSIONS;

MCVersionManager.prototype.resolve = function(file) {
	return path.resolve(this.directory, file);
}

// returns the path for a specified version
MCVersionManager.prototype.getPath = function(version) {
	return this.resolve(util.format(this.filename, { v: version }));
}

// checks if versions exists
MCVersionManager.prototype.exists = function(version) {
	return util.fileExistsAsync(this.getPath(version)).bind(this);
}

// downloads a version of the server
MCVersionManager.prototype.download = function(version) {
	var filename = this.getPath(version),
		dirname = path.dirname(filename),
		url = MCVersionManager.getURL(version);

	return mkdirp(dirname).bind(this).then(function() {
		return new Promise(function(resolve, reject) {
			http.get(url, onResponse).on('error', reject);

			function onResponse(res) {
				if (res.statusCode != 200)
					return reject(new Error("Non-200 status returned."));

				res.on("error", reject);
				res.on("end", resolve);
				res.pipe(fs.createWriteStream(filename));
			}
		});
	});
}

// prepares the directory for the version of minecraft
MCVersionManager.prototype.load = function(version, savepath) {
	var file = this.getPath(version);
	savepath = path.resolve(savepath);

	// download the version if it doesn't exist
	return this.exists(version).then(function(exists) {
		if (!exists) return this.download(version);
	})

	// ensure savepath directory exists
	.then(function() {
		var dir = path.dirname(savepath);
		if (dir === this.directory)
			throw new Error("Refusing to write to version directory.");

		return mkdirp(dir);
	})

	// copy the file over
	.then(function() {
		return new Promise(function(resolve, reject) {
			var read = fs.createReadStream(file);
			read.on("error", reject);
			read.on("end", resolve);
			read.pipe(fs.createWriteStream(savepath));
		});
	});
}

MCVersionManager.getURL = function(version) {
	if (!_.contains(MC_VERSIONS, version))
		throw new Error("Unsupported version '" + version + "'");

	return util.format(MC_URL, { v: version });
}