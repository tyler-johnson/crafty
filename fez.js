var fez = require("fez"),
	browserify = require('browserify'),
	Promise = require("bluebird"),
	path = require("path"),
	through = require("through"),
	_ = require("underscore"),
	mdeps = require("module-deps"),
	coffeeify = require("coffeeify"),
	builtins = require("browser-builtins"),
	uglify = require("fez-uglify"),
	Ractive = require("ractive");

var has = Object.hasOwnProperty.bind(Object);

function htmlr(file) {
	if (path.extname(file) !== ".html") return through();

	var data = '';
	return through(write, end);

	function write (buf) { data += buf }
	function end () {
		var tpl, src;
		try {
			tpl = Ractive.parse(data);
			src = "var _ = require(\"underscore\");\nmodule.exports = (" + JSON.stringify(tpl) + ");";
		} catch (error) {
			this.emit('error', error);
		}
		this.queue(src);
		this.queue(null);
	}
}

exports.build = function(spec) {
	spec.with("client/index.js").one(function(files) {
		var cache = {};
		var secondary = files.map(function(file) {
			return new Promise(function(resolve, reject) {
				var filename = path.resolve(__dirname, file.getFilename()),
					deps = [],
					dstream = mdeps(filename, {
						modules: builtins,
						transform: [ htmlr, coffeeify ],
						extensions: [ ".js", ".json", ".coffee", ".html" ]
					});

				dstream.on("data", function(dep) {
					cache[dep.id] = dep;
					if (!dep.entry) deps.push(path.relative(__dirname, dep.id));
				});

				dstream.on("error", reject);
				dstream.on("end", function() {
					resolve(deps);
				});
			});
		});

		spec.rule(files, secondary, 'public/js/main.js', function(inputs) {
			var b = browserify({
				extensions: [ ".html", ".coffee" ]
			});

			b.transform(htmlr);
			b.transform(coffeeify);

			inputs.forEach(function(input) {
				b.add(path.resolve(__dirname, input.getFilename()));
			});

			var resolver = Promise.defer();
			b.bundle({ debug: true, cache: cache }, resolver.callback);
			return resolver.promise;
		});
	});
}

exports.default = exports.build;
fez(module);