var convict = require("convict");

// Convict Schema
module.exports = convict({
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
	}
});