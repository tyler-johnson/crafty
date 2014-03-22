var fez = require("fez"),
	less = require("less"),
	browserify = require('browserify'),
	Promise = require("bluebird"),
	path = require("path"),
	through = require("through"),
	_ = require("underscore"),
	mdeps = require("module-deps");

var has = Object.hasOwnProperty.bind(Object);

function htmlr(file) {
	if (path.extname(file) !== ".html") return through();

	var data = '';
	return through(write, end);

	function write (buf) { data += buf }
	function end () {
		var tpl, src;
		try {
			tpl = _.template(data, null, { variable: "$" });
			src = "var _ = require(\"underscore\");\nmodule.exports = (" + tpl.source + ");";
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

fez(function(spec) {
	spec.with("./client/scripts/index.js").one(function(files) {
		var secondary = files.map(function(file) {
			return new Promise(function(resolve, reject) {
				var filename = path.resolve(__dirname, file.getFilename()),
					deps = [],
					dstream = mdeps(filename, {
						transform: htmlr,
						extensions: [ ".html", ".js", ".json" ]
					});

				dstream.on("data", function(dep) {
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
				extensions: [ ".html" ]
			});

			b.transform(htmlr);

			inputs.forEach(function(input) {
				b.add(input.getFilename());
			});

			var resolver = Promise.defer();
			b.bundle({ debug: true }, resolver.callback);
			return resolver.promise;
		});
	});

	spec.with("./client/styles/main.less").one(function(files) {
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
});