var _ = require("underscore"),
	yaml = require("js-yaml"),
	javaProps = require("properties-parser"),
	Promise = require("bluebird"),
	fs = Promise.promisifyAll(require("fs")),
	path = require("path"),
	rimraf = require("rimraf"),
	rimrafAsync = Promise.promisify(rimraf),
	mkdirp = require("mkdirp"),
	mkdirpAsync = Promise.promisify(mkdirp),
	ncp = Promise.promisify(require("ncp"));

var files =
module.exports = {
	
	txt: {
		parse: function(data) {
			return _.compact(data.split("\n"));
		},
		stringify: function(data) {
			return data.join("\n");
		}
	},
	
	json: {
		parse: function(data) {
			return JSON.parse(data);
		},
		stringify: function(data) {
			return JSON.stringify(data, null, "\t");
		}
	},
	
	properties: {
		parse: function(data) {
			var props = javaProps.parse(data);
			
			_.each(props, function(val, key) {
				if (val.toLowerCase() === "true") props[key] = true;
				else if (val.toLowerCase() === "false") props[key] = false;
				else if (val.match(/^[0-9]+(?:\.[0-9]+)?$/i)) props[key] = parseFloat(val, 10);
			});
			
			return props;
		},
		stringify: function(data) {
			var jp = javaProps.createEditor();
			
			_.each(data, function(val, key) {
				jp.set(key, val);
			});
			
			return jp.toString();
		}
	},

	yaml: {
		parse: function(data) {
			return yaml.safeLoad(data);
		},
		stringify: function(data) {
			return yaml.safeDump(data);
		}
	},
	
	byType: function(type) {
		// no type? no problem!
		if (!type) return null;

		// accept extensions as type
		if (type[0] === ".") type = type.substr(1);

		switch(type) {
			case "txt":
			case "text":
				return files.txt;
				
			case "json":
				return files.json;
			
			case "properties":
			case "props":
				return files.properties;
			
			case "yaml":
			case "yml":
				return files.yaml;

			default:
				return null;
		}
	},
	
	parse: function(data, type) {
		var t = files.byType(type);
		return t ? t.parse(data) : data;
	},

	stringify: function(data, type) {
		var t = files.byType(type);
		return t ? t.stringify(data) : data;
	},

	exists: function(name) {
		return new Promise(function(resolve) {
			fs.exists(name, resolve);
		});
	},

	mkdir: function(dirname) { return mkdirpAsync(dirname); },
	mkdirSync: function(dirname) { return mkdirp.sync(dirname); },

	read: function(name) {
		return fs.readFileAsync(name, { encoding: "utf-8" }).then(function(data) {
			return files.parse(data, path.extname(name));
		});
	},

	readSync: function(name) {
		return files.parse(fs.readFileSync(name, { encoding: "utf-8" }), path.extname(name));
	},

	save: function(name, data) {
		return mkdirpAsync(path.dirname(name)).then(function() {
			return fs.writeFileAsync(name, files.stringify(data, path.extname(name)));
		});
	},

	saveSync: function(name) {
		mkdirp.sync(path.dirname(name));
		return fs.writeFileSync(name, files.stringify(data, path.extname(name)));
	},

	delete: function(name) { return rimrafAsync(name); },
	deleteSync: function(name) { return rimraf.sync(name); },

	copy: function(src, dest, options) {
		return mkdirpAsync(path.dirname(dest)).then(function() {
			return ncp(src, dest, options || {});
		});
	}

};