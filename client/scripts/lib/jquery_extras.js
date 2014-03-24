// returns form data as object
jQuery.fn.serializeObject = function() {
	var json, patterns, push_counters, build, push_counter;
	json = {};
	push_counters = {};
	patterns = {
		validate: /^[a-zA-Z0-9_-]*(?:\[(?:\d*|[a-zA-Z0-9_-]+)\])*$/,
		key: /[a-zA-Z0-9_-]+|(?=\[\])/g,
		push: /^$/,
		fixed: /^\d+$/,
		named: /^[a-zA-Z0-9_-]+$/
	};
	build = function(base, key, value) {
		base[key] = value;
		return base;
	};
	push_counter = function(key) {
		if (push_counters[key] === void 0) {
			push_counters[key] = 0;
		}
		return push_counters[key]++;
	};
	$.each($(this).serializeArray(), function(i, elem) {
		var k, keys, merge, re, reverse_key;
		if (!patterns.validate.test(elem.name)) {
			return;
		}
		keys = elem.name.match(patterns.key);
		merge = elem.value;
		reverse_key = elem.name;
		while ((k = keys.pop()) !== void 0) {
			if (patterns.push.test(k)) {
				re = new RegExp("\\[" + k + "\\]$");
				reverse_key = reverse_key.replace(re, '');
				merge = build([], push_counter(reverse_key), merge);
			} else if (patterns.fixed.test(k)) {
				merge = build([], k, merge);
			} else if (patterns.named.test(k)) {
				merge = build({}, k, merge);
			}
		}
		return json = $.extend(true, json, merge);
	});
	return json;
}

// better css method that returns all styles
var css2json = 
window.css2json = function(css){
		var styles = {};

		if (css == null) return styles;
		else if (css instanceof CSSStyleDeclaration) {
			for (var i = 0; i < css.length; i++) {
				var key = css[i].toLowerCase();
				styles[key] = css[key];
			}
		} 
		else if (typeof css == "string") {
			css = css.split(";");
			for (var i in css) {
				var parts = css[i].split(":");
				if (parts.length !== 2) continue;

				var key = parts[0].trim().toLowerCase(),
					value = parts[1].trim();

				styles[key] = value;
			}
		}

		return styles;
}

var oldcss = jQuery.fn.css;
jQuery.fn.css = function() {
	if (arguments.length) return oldcss.apply(this, arguments);
	else {
		var o = {}, a = this,
			rules = window.getComputedStyle(a.get(0));

		return $.extend(o, css2json(rules), css2json(a.attr('style')));
	}
}