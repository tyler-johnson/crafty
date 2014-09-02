var Mustache = require("temple-mustache"),
	through = require("through");

function htmlr(file) {
	if (file.substr(-5) !== ".html") return through();

	var data = '';
	return through(write, end);

	function write (buf) { data += buf }
	function end () {
		var result, src;
		
		try {
			result = Mustache.parse(data);
			src = "module.exports = " + JSON.stringify(result) + ";";
		} catch (error) {
			this.emit('error', error);
		}

		this.queue(src);
		this.queue(null);
	}
}

module.exports = function(grunt) {

	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		browserify: {
			production: {
				src: "client/index.js",
				dest: "public/js/main.js",
				options: {
					transform: [ htmlr ],
					browserifyOptions: {
						extensions: [ ".html" ]
					}
				}
			},
			development: {
				src: "client/index.js",
				dest: "public/js/main.js",
				options: {
					transform: [ htmlr ],
					browserifyOptions: {
						debug: true,
						extensions: [ ".html" ]
					}
				}
			}
		},
		exorcise: {
			development: {
				files: {
					'public/js/main.js.map': [ 'public/js/main.js' ],
				}
			}
		},
		uglify: {
			production: {
				src: "public/js/main.js",
				dest: "public/js/main.js"
			}
		},
		watch: {
			main: {
				files: [ "client/**/*.+(js|html)" ],
				tasks: [ 'build-development' ],
				options: { spawn: false }
			}
		}
	});

	grunt.loadNpmTasks('grunt-contrib-watch');
	grunt.loadNpmTasks('grunt-browserify');
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-exorcise');

	grunt.registerTask('build-development', [ 'browserify:development', 'exorcise:development' ]);
	grunt.registerTask('build-production', [ 'browserify:production', 'exorcise:production' ]);

	grunt.registerTask('dev', [ 'build-development', 'watch' ]);
	grunt.registerTask('default', [ 'build-production' ]);

}