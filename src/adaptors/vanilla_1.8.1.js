var _ = require("underscore"),
	Adaptor = require("../adaptor"),
	files = require("../files"),
	path = require("path"),
	Promise = require("bluebird"),
	http = require("http"),
	https = require("https"),
	fs = Promise.promisifyAll(require("fs")),
	exec = require("child_process").exec,
	moment = require('moment');

var JAVA_PATH = "java",
	PATTERNS = {
		version: /^Starting minecraft server version ([.0-9a-zA-Z]+)$/,
		done:    /^Done \([.0-9a-zA-Z]+\)!/,
		join:    /^(\w+) ?(?:\[(.+)\] )?logged in with entity id (\d+) at \(([\d\s\-\.,]+)\)$/,
		leave:   /^(\w+) lost connection: (.+)$/,
		bind:    /^\*+ FAILED TO BIND TO PORT\!$/,
		eula:    /agree to the EULA/
	};

var Vanilla =
module.exports = Adaptor.extend({

	constructor: function() {
		this.players = {};
		Adaptor.apply(this, arguments);
	},

	name: "vanilla_1.8.1",
	type: "Vanilla",
	version: "1.8.1",
	binaryFileName: "vanilla_1.8.1.jar",

	binaryActivePath: function() {
		return this.manager.resolveActivePath(this.binaryFileName);
	},

	binaryCachePath: function() {
		return this.manager.resolveBinaryPath(this.binaryFileName)
	},

	load: function() {
		// download and cache minecraft server binary
		return this.cacheBinary()

		// symlink the binary into the active folder
		.then(function() { return this.linkBinary(); })

		// create all the minecraft config files
		.then(function() { return this.loadRuntimeFiles(); });
	},

	// downloads the minecraft binary to the hard drive
	cacheBinary: function() {
		var binPath = this.binaryCachePath(),
			url = Vanilla.binaryURL(this.version);

		// check if the binary already exists
		return files.exists(binPath).bind(this).then(function(exists) {
			// do nothing if it does
			if (exists) return;

			// make any leading directories
			return files.mkdir(path.dirname(binPath))

			// download the file and save it
			.then(function() {
				return new Promise(function(resolve, reject) {
					// basic get request
					(url.substr(0,5) === "https" ? https : http)
					.get(url, onResponse)
					.on('error', reject);

					// response data is piped directly to the hard drive
					function onResponse(res) {
						if (res.statusCode != 200)
							return reject(new Error("Non-200 status returned."));

						res.on("error", reject);
						res.on("end", resolve);
						res.pipe(fs.createWriteStream(binPath));
					}
				});
			});
		});
	},

	// symlink the binary into the active folder
	linkBinary: function() {
		var binPath = this.binaryActivePath(),
			binRealPath = this.binaryCachePath();

		// check if it already exists
		return fs.lstatAsync(binPath).bind(this).then(function(stat) {
			return Promise.try(function() {
				// not a symlink? not what we want
				if (!stat.isSymbolicLink()) return false;

				// read link path and verify it points where we want
				return fs.readlinkAsync(binPath).then(function(sympath) {
					return sympath === binRealPath;
				});
			})

			// always delete existing item if false
			.tap(function(exists) {
				if (!exists) files.delete(binPath);
			});
		}, function(e) {
			if (e && e.cause && e.cause.code === "ENOENT") return false;
			throw e;
		})

		// if it doesn't exist, symlink away!
		.then(function(exists) {
			if (!exists) return fs.symlinkAsync(this.binaryCachePath(), binPath);
		});
	},

	runtime: function(key, value, force) {
		if (this.runtime == null) this.runtime = {};
		
		var rt = this.runtime,
			prop = Vanilla.runtime[key];
		
		if (prop == null) {
			throw new Error("Unknown runtime key '" + key + "'.");
		}

		// read
		if (arguments.length === 1) {
			if (rt[key] == null) {
				value = _.clone(this.manager.setting(key));
				rt[key] = _.defaults(value || {}, prop.default);
			}

			return rt[key];
		}

		// write
		else if (arguments.length >= 2) {
			value = _.extend({}, value, prop.default);

			// make sure value has changed
			if (!force && rt[key] && _.isEqual(value, rt[key])) {
				return Promise.bind(this);
			}

			// set the value
			this.manager.settings.set(key, rt[key] = value);

			// save the configuration
			return this.manager.saveSettings().bind(this);
		}
	},

	loadRuntimeFiles: function() {
		var self = this;

		return Promise.map(Object.keys(Vanilla.runtime), function(key) {
			var prop = Vanilla.runtime[key],
				value = self.runtime(key);

			return files.save(self.manager.resolveActivePath(prop.file), value);
		}, { concurrency: 1 }).bind(this);
	},

	start: function() {
		if (this.isRunning()) return false;

		this.readyState = "starting";
		// this.emit("start");

		var binPath = this.binaryActivePath(),
			cmd = Vanilla.command(binPath, this.manager.setting("ram"));

		this.process = exec(cmd, {
			cwd: path.dirname(binPath),
			killSignal: 'SIGINT'
		});

		this.process.stdout.on("data", _.bind(this._onData, this));
		this.process.stderr.on("data", _.bind(this._onError, this));
		this.process.once("exit", _.bind(this._onExit, this));

		return true;
	},

	stop: function() {
		if (this.isStopped()) return false;
		
		this.state = "stopping";
		_.keys(this.players).forEach(this._playerLeft.bind(this));
		this.players = {};

		// command last to guarantee state order
		this.emit("stop");
		this.command("stop");
		
		return true;
	},

	restart: function() {
		if (this.stop()) this.once("exit", this.start);
		else this.start();
		return this;
	},

	command: function() {
		if (this.process != null) {
			var cmd = _.toArray(arguments).join(" ") + "\n";
			this.process.stdin.write(cmd);
		}

		return this;
	},

	say: function(msg) {
		return this.command("say", msg);
	},

	isOnline: function(name) {
		return this.players.hasOwnProperty(name);
	},

	getPlayer: function(name) {
		return this.players[name];
	},

	_onData: function(data) {
		this.emit("data", data);

		var line = Vanilla.parseLine(data);
		if (line == null) return;
		this.emit("line", line);

		_.some(PATTERNS, _.bind(function(reg, key) {
			var m = reg.exec(line.text);
			if (m == null) return;
			
			switch(key) {
				case "version":
					this.emit("version", m[1]);
					break;

				case "done":
					this.state = "running";
					this.emit("ready");
					break;

				case "join":
					var meta, name = m[1], host = m[2],
						pos = m[4].split(",").map(function(p) {
							return parseFloat(p.trim());
						});

					meta = {
						name: name,
						host: host[0] === "/" ? host.substr(1) : host,
						id: m[3],
						position: pos
					}
					
					this.players[name] = meta;
					this.emit("join", name, meta);
					break;

				case "leave":
					this._playerLeft(m[1]);
					break;

				case "bind":
					this.emit("error", new Error("Failed to bind port."));
					break;

				case "eula":
					this.emit("eula");
			}

			return true;
		}, this));
	},

	_onError: function(data) {
		if (/^Error/.test(data) || /^Exception/.test(data)) {
			this.emit("error", new Error(data));
		} else {
			this.emit("data", data);
		}
	},

	_onExit: function() {
		delete this.process;
		this.state = "stopped";
		this.emit("exit");
	},

	_playerLeft: function(name) {
		if (this.isOnline(name)) {
			delete this.players[name];
			this.emit("leave", name);
		}
	}

}, {

	MC_URL: "https://s3.amazonaws.com/Minecraft.Download/versions/%v/minecraft_server.%v.jar",

	binaryURL: function(version) {
		return Vanilla.MC_URL.replace(/%v/g, version);
	},

	command: function(jar, ram) {
		if (ram == null) ram = "1G";

		return [
			JAVA_PATH,
			"-jar",
			"-Xms" + ram,
			"-Xmx" + ram,
			jar,
			"nogui"
		].join(" ");
	},

	parseLine: function (line) {
		var match = line.match(/^\[([0-9\:]+)\] \[([^\]]+)\]: (.*)/i);
		if (match == null) return;

		var ref = match[2].split("/");

		return {
			date:  moment(match[1], "HH:mm:ss").toDate(),
			from:  ref[0],
			level: ref[1] == null ? "" : ref[1],
			text:  match[3]
		};
	},

	runtime: {
		game: {
			file: "server.properties",
			default: {
				"generator-settings": "",
				"op-permission-level": 4,
				"allow-nether": true,
				"level-name": "world",
				"enable-query": false,
				"allow-flight": false,
				"announce-player-achievements": true,
				"server-port": 25565,
				"level-type": "DEFAULT",
				"enable-rcon": false,
				"force-gamemode": false,
				"level-seed": "",
				"server-ip": "",
				"max-build-height": 256,
				"spawn-npcs": true,
				"white-list": false,
				"spawn-animals": true,
				"snooper-enabled": true,
				hardcore: false,
				"online-mode": true,
				"resource-pack": "",
				pvp: true,
				difficulty: 1,
				"enable-command-block": false,
				"player-idle-timeout": 0,
				gamemode: 0,
				"max-players": 20,
				"spawn-monsters": true,
				"view-distance": 10,
				"generate-structures": true,
				motd: "A Minecraft Server"
			}
		}
	}


});