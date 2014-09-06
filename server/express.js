var Promise = require("bluebird"),
	_ = require("underscore"),
	morgan = require('morgan'),
	compression = require('compression'),
	serveStatic = require('serve-static'),
	lessMiddleware = require('less-middleware'),
	fs = Promise.promisifyAll(require("fs")),
	path = require("path");

// express app and server
var app = global.$app = module.exports = require("express")();
global.$server = require("http").Server(app);

// express middleware
if ($conf.get("env") === "development") {
	app.use(morgan("dev"));
} else {
	app.use(morgan("combined"));
	app.use(compression());
}

app.use(lessMiddleware("public/less", {
	dest: $resolve("public"),
	compiler: {
		compress: false,
		cleancss: $conf.get("env") === "production"
	},
	preprocess: {
		path: function(pathname, req) {
			return $resolve(pathname.replace("css/", ""));
		}
	}
}));

// app.use(express.static(resolve("client/dist")));
app.use(serveStatic($resolve("public")));

// the one and only route
var pkg = require("../package.json"),
	MC_VERSIONS = require("./versions").supported,
	layout = _.template(fs.readFileSync($resolve("server/layout.html"), "utf-8"), { variable: "$" });

app.use(function(req, res, next) {
	res.send(layout({
		styles: [
			"/css/main.css"
		],
		scripts: [
			"/js/main.js"
		],
		runtime: {
			env: $conf.get("env"),
			name: pkg.name,
			version: pkg.version,
			minecraft_versions: MC_VERSIONS
		}
	}));
});