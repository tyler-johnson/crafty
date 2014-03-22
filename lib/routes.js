

module.exports = function(app) {

	app.use(function(req, res, next) {
		res.render("index", {
			styles: [
				"/main.css"
			],
			scripts: [
				"/socket.io/socket.io.js",
				"/main.js"
			]
		});
	});

}