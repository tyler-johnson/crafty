_ = require "underscore"
path = require "path"
{Events} = require "backbone"

# set up the app
module.exports =
app =
	# app state
	state: "init"
	initTimer: new Date # date cache for the *rough* time of launch

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

# attach events
_.extend app, Events

# attach runtime
if (_.isObject(__app_runtime_variables__))
	_.extend(app, __app_runtime_variables__);

# init app
app.init()