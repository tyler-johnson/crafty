var _ = require("underscore");

module.exports = View.extend({
	initialize: function() {
		this.use("actions");
	},
	template: require("../templates/console.html"),
	defaults: {
		placeholder: function() {
			return this.get("craft.state") === "running" ?
				"Enter a command and press enter to send." :
				"Commands can only be entered while the server is running.";
		}
	},
	actions: {
		submit: function(e) {
			if (e.original.keyCode !== 13) return;
			e.original.preventDefault();
			
			var val = e.node.value,
				craft = this.get("craft");

			if (_.isEmpty(val)) return;
			else if (val === "clear") craft.clearLog();
			else craft.command(val);
			
			e.node.value = "";
		}
	},
	decorators: {
		disabled: function(input) {
			return { parse: false, update: function() {
				input.disabled = this.get("craft.state") !== "running";
			} }
		},
		sticky: function(el) {
			var sticky = true,
				sticking = false,
				onScroll, stick;

			el.addEventListener("scroll", onScroll = function(e) {
				if (sticking) return;

				// sticks to bottom if within 5px of the bottom
				sticky = Math.abs(el.scrollHeight - el.clientHeight - el.scrollTop) < 5;
			});

			stick = _.debounce(function(n) {
				if (!n) {
					sticking = false;
					return;
				}

				sticking = true;
				if (sticky) el.scrollTop = el.scrollHeight;
				if (n) stick(--n);
			}, 60);

			// start at the bottom on load
			el.scrollTop = el.scrollHeight;

			return {
				parse: false,
				update: function() {
					this.depend("craft.feed.length");
					stick(3);
				},
				destroy: function() {
					el.removeEventListener("scroll", onScroll);
				}
			}
		}
	}
});