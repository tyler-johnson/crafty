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
	}
});