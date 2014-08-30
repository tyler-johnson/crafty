var Backbone = require("backbone"),
	_ = require("underscore"),
	Promise = require("bluebird"),
	util = require("../../lib/util");

var Prop = Backbone.Model.extend({
	sync: sync,
	idAttribute: "_id"
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

var emit = util.asyncSocketEvent.bind(null, socket);

// a blank function
function noop(){}

function sync(method, model, options) {
	if (options == null) options = {};
	if (!_.isFunction(options.success)) options.success = noop;
	if (!_.isFunction(options.error)) options.error = noop;

	var promise = Promise.try(function() {
		var id;

		switch(method) {
			case "read":
				if (model instanceof Prop) id = model.id;
				return emit("props:read", id);

			case "create":
				throw new Error("Cannot create.");

			case "update":
				// var prop = RUNTIME[model.id];
				// if (prop == null) return;
				// return $env.writeFile(prop.file, model.toJSON());

			case "delete":
				// var prop = RUNTIME[model.id];
				// if (prop == null) return;
				// return fs.unlinkAsync($env.resolve(prop.file));
		}

	});

	promise.then(function(data) {
		console.log(data);
	});
	promise.then(options.success, options.error);
	model.trigger('request', model, promise, options);
	return promise;
}