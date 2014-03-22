_ = require "underscore"
path = require "path"
{Events} = require "backbone"

# get a copy of package.json to keep things DRY
pkg = require("../../../package.json");

# set up the app
module.exports =
app =
	# app state
	state: "init"
	initTimer: new Date # date cache for the *rough* time of launch

	# app environment
	dir: process.cwd()
	env: process.env.NODE_ENV
	version: pkg.version
	name: pkg.name

	# init defers a call to start
	init: () -> _.defer @wait()

	# starts up the app
	start: () ->
		if @state is "error"
			console.warn "App failed to initiate."
		else
			console.log "App initiated successfully in #{new Date - @initTimer}ms."
			@trigger @state = "ready" # make it ready
		delete @_wait_cnt # clean
		@start = -> # prevent re-access
		return @ # chaining

	# tell the app to wait on a async request
	wait: (fn) ->
		@_wait_cnt = 0 if _.isUndefined @_wait_cnt
		@_wait_cnt++
		return _.once () ->
			app._wait_cnt--
			fn.apply @, arguments if _.isFunction fn
			app.start() if app._wait_cnt <= 0

	# call a function now or on ready
	ready: (fn) ->
		if @state is "ready" then fn.call app
		else @once "ready", fn
		return @ # chaining

	# put app in an error state
	error: (err) ->
		@_lastError = err

		if @state is "init"
			console.info "Exception preventing startup:\n"
			console.error err
			@state = "error"
		else @trigger "error", err

		return @ # chaining

	# convenience method for turning a relative path into an absolute path
	path: (args...) ->
		args = _.compact _.flatten args
		args.unshift @dir
		path.resolve.apply path, args

	# convenience method for turning an absolute path into a relative path
	relative: (to, lead = false) -> (if lead then "/" else "") + path.relative @dir, to

# attach events
_.extend app, Events

# init app
app.init()
