var _ = require("underscore");

var specialTypes = {
	regex: _.isRegExp,
	array: _.isArray,
	date: _.isDate,
	nan: _.isNumber,
	"null": _.isNull
}

exports.typeof = function(val) {
	var type;

	_.some(specialTypes, function(fn, t) {
		if (fn(val)) return type = t;
	});

	return type != null ? type : typeof(val);
}