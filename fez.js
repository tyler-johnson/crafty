var fez = require("fez"),
	less = require("less"),
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

function lessParser(file) {
	return new(less.Parser)({
		paths: [ path.dirname(file.getFilename()) ],
		filename: file.getFilename()
	});
}

exports.build = function(spec) {
	spec.with("client/scripts/index.js").one(function(files) {
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

		spec.rule(files, secondary, 'client/dist/main.js', function(inputs) {
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

	// spec.with("client/dist/*.js").not('client/dist/*.min.js').each(function(file) {
	// 	spec.rule(file, file.patsubst("client/dist/%.js", "client/dist/%.min.js"), uglify());
	// });

	spec.with("client/styles/main.less").one(function(files) {
		var secondary = files.map(function(file) {
			var parser = lessParser(file);

			return file.asBuffer()
				.then(function(data) {
					var resolver = Promise.defer(),
						src = data.toString("utf-8");

					parser.parse(src, resolver.callback);
					return resolver.promise;
				})
				.then(function(tree) {
					return tree.rules
						.filter(function(rule) { return rule.importedFilename; })
						.map(function(rule) { return rule.importedFilename; });
				});
		});

		spec.rule(files, secondary, "client/dist/main.css", function(inputs) {
			var input = inputs[0],
				parser = lessParser(input);

			return input.asBuffer()
				.then(function(contents) {
					var resolver = Promise.defer(),
						src = contents.toString("utf-8");

					parser.parse(src, resolver.callback);
					return resolver.promise;
				})
				.then(function(tree) {
					return tree.toCSS({
						// cleancss: true,
						// cleancssOptions: {
						// 	keepSpecialComments: 0
						// }
					});
				})
				.catch(function(e) {
					if (e.index != null || e.line != null)
						console.error("Less Error: %s\n  => %s %s:%s", e.message, e.filename, e.index, e.line);

					throw e;
				});
		});
	});
}

exports.default = exports.build;
fez(module);