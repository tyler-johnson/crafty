var Backbone = require("backbone"),
	_ = require("underscore"),
	Promise = require("bluebird"),
	fs = Promise.promisifyAll(require("fs"));

// defaults and file names
var RUNTIME = require("./runtime");

var Prop = Backbone.Model.extend({
	sync: sync,
	idAttribute: "_id",
	toJSON: function() {
		return this.has("_value") ? this.get("_value") : this.omit(this.idAttribute);
	}
});

var Props =
module.exports = Backbone.Collection.extend({
	sync: sync,
	model: Prop,
	saveAll: function(options) {
		return Promise.all(this.map(function(prop) {
			return prop.save(null, options);
		}));
	}
});

// a blank function
function noop(){}

function sync(method, model, options) {
	if (options == null) options = {};
	if (!_.isFunction(options.success)) options.success = noop;
	if (!_.isFunction(options.error)) options.error = noop;

	var promise = Promise.try(function() {

		function fetch(id) {
			var prop = RUNTIME[id];
			if (prop == null) return;

			return $env.readFile(prop.file)
				.then(function(data) {
					if (data == null) data = _.clone(prop.default);
					if (_.isArray(data)) data = { _value: data };
					if (!_.isObject(data)) data = {};
					data._id = id;
					return data;
				});
		}

		switch(method) {
			case "read":
				if (model instanceof Props) return Promise.all(_.map(_.keys(RUNTIME), fetch));
				else if (model instanceof Prop) return fetch(model.id);
				else throw new Error("Model must be of Properties.");

			case "create":
				throw new Error("Cannot create.");

			case "update":
				var prop = RUNTIME[model.id];
				if (prop == null) return;
				return $env.writeFile(prop.file, model.toJSON());

			case "delete":
				var prop = RUNTIME[model.id];
				if (prop == null) return;
				return fs.unlinkAsync($env.resolve(prop.file));
		}

	});

	promise.then(options.success, options.error);
	model.trigger('request', model, promise, options);
	return promise;
}

function rando(n) {
	var str = "";
	while(n--) {
		str += Math.floor(Math.random() * 16).toString(16);
	}
	return str;
}