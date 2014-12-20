var _ = require("underscore"),
	Manager = require("./manager"),
	configure = require("./config"),
	utils = require("./utils"),
	files = require("./files");

module.exports = function(options) {
	var config = configure(options),
		craft = new Manager(config.get("cwd")),
		settingsFile = config.get("settings"),
		settings;

	// try to find a config files
	if (!_.isEmpty(settingsFile)) {
		settingsFile = craft.resolve(settingsFile);
		settings = files.readSync(settingsFile);
	} else {
		[ "settings.json", "settings.yaml" ].some(function(f) {
			try {
				settingsFile = craft.resolve(f);
				settings = files.readSync(settingsFile);
				return true;
			} catch(e){}
		});
	}

	// if we got settings, load it
	if (settings != null) {
		settings.savePath = settingsFile;
		craft.settings.load(settings);
	}

	craft.load().then(function() {
		craft.active.on("data", function(d) {
			console.log(d.trim());
		});

		craft.active.on("error", function(e) {
			console.error(e.stack);
		});

		craft.start();
	});
}