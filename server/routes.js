var Environment = require("./env");

var pkg = require("../package.json");

module.exports = function(app) {

	app.use(function(req, res, next) {
		res.render("index", {
			styles: [
				"/css/main.css"
			],
			scripts: [
				"/socket.io/socket.io.js",
				"/js/main.js"
			],
			runtime: {
				env: process.env.NODE_ENV,
				name: pkg.name,
				version: pkg.version,
				minecraft_versions: Environment.supported
			}
		});
	});

}