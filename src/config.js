var convict = require("convict");

var schema = {
	env: {
		doc: "Node environment.",
		format: [ "development", "production" ],
		default: "production",
		env: "NODE_ENV"
	},
	port: {
		doc: "The port to start the HTTP server on.",
		format: "port",
		default: 3000,
		env: "PORT"
	},
	cwd: {
		doc: "The current working directory that server files will be written to.",
		format: String,
		default: process.cwd(),
		env: "CRAFTY_PATH"
	},
	settings: {
		doc: "Minecraft server settings.",
		format: String,
		default: null,
		env: "CRAFTY_SETTINGS"
	}
};

module.exports = function(base) {
	var config = convict(schema);
	if (typeof base === "string" || Array.isArray(base)) config.loadFile(base);
	else if (base != null) config.load(base);
	return config;
}