var Promise = require("bluebird"),
	fs = require("fs");

var fex = /%([a-z])/gi;

exports.format = function(str, data) {
	var m, lastIndex = 0,
		res = "";
	
	while (m = fex.exec(str)) {
		res += str.substring(lastIndex, m.index);
		if (data[m[1]] != null) res += data[m[1]].toString();
		lastIndex = m.index + m[0].length;
	}

	res += str.substr(lastIndex);
	return res;
}

exports.fileExistsAsync = function(file) {
	return new Promise(fs.exists.bind(fs, file));
}