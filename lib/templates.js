var _ = require("underscore"),
	EventEmitter = require("events").EventEmitter,
	Promise = require("bluebird"),
	fs = Promise.promisifyAll(require("fs")),
	path = require("path");

module.exports = (function() {

	function Templates(dir, options) {
		if (!(this instanceof Templates))
			return new Templates(dir, options);

		this.store = {};
		this.helpers = {};
		this.base = dir ? path.resolve(dir) : null;
		this.options = _.defaults(options || {}, {
			extension: ".html"
		});
	}

	// eventful
	_.extend(Templates.prototype, EventEmitter.prototype);

	Templates.prototype.resolve = function(file) {
		return path.resolve(this.base, file);
	}

	// express middleware for rendering templates
	Templates.prototype.middleware = function(opts) {
		var self = this;
		opts = _.defaults(opts || {}, {
			layout: null
		});

		return function(req, res, next) {
			res.render = function(view, data, options) {
				var body, full;
				
				function render(view, ctx) {
					return self.render(view, _.extend({}, {
						_req: req,
						_res: res,
						_options: options,
						include: render
					}, ctx || {}));
				}

				try {
					options = _.defaults(options || {}, opts);
					data = _.extend({}, res.locals, data || {});
					body = render(view, data);

					if (options.layout != null && view !== options.layout) {
						full = render(options.layout, _.extend({}, {
							body: body,
							view: view
						}, data));
					}
					
					res.type(self.options.extension);
					res.send(200, full != null ? full : body);
				} catch(e) {
					req.next(e);
				}
			}

			next();
		}
	}

	// load html documents directly or recursively
	Templates.prototype.load = function(file, cb) {
		if (_.isFunction(file) && cb == null) {
			cb = file;
			file = null;
		}

		file = file == null ? this.base : this.resolve(file);

		return fs.statAsync(file)
			.bind(this)
			.then(function(stat) {
				if (stat.isDirectory()) {
					return fs.readdirAsync(file)
						.bind(this)
						.map(function(n) {
							return this.load(path.join(file, n));
						});
				} else if (stat.isFile() && path.extname(file) === this.options.extension) {
					return fs.readFileAsync(file, { encoding: "utf-8" })
						.bind(this)
						.then(function(content) {
							this.store[this.name(file)] = this.compile(content);
						});
				}
			})
			.nodeify(cb);
	}

	// parses a str as an underscore template
	Templates.prototype.compile = function(str) {
		return _.template(str, null, { variable: "$" });
	}

	// tests if file path resides in this.base directory
	Templates.prototype.inBase = function(file) {
		return this.base != null && file.substr(0, this.base.length) === this.base;
	}

	// generates a template name from a full file path
	Templates.prototype.name = function(file) {
		if (file.substr(-5) === this.options.extension) file = file.substr(0, file.length - 5);
		if (this.inBase(file)) file = file.substr(this.base.length);
		if (file[0] === "/") file = file.substr(1);
		return file;
	}

	// gets a template
	Templates.prototype.get = function(name) {
		var tpl = this.store[name];
		if (tpl == null) throw new Error("Missing template '" + name + "'.");
		return tpl;
	}

	// renders tpl with data
	Templates.prototype.render = function(name, data) {
		return this.get(name).call({}, _.extend({}, this.helpers, {
			_view: name,
			_tpl: this,
		}, data || {}));
	}

	Templates.prototype.addHelper = function(name, fn) {
		this.helpers[name] = fn;
		return this; // chaining
	}

	return Templates;

})();