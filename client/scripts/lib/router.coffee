page = require "page"
{Events} = require "backbone"
_ = require "underscore"
qs = require "querystring"

# augmented context
__router_context = null
page "*", (ctx, next) ->
	# parse query
	ctx.query = qs.parse ctx.querystring

	_.extend ctx, Events # eventful

	# close context
	ctx.close = () ->
		__router_context.trigger "close"
		__router_context.off() # remove all events
		__router_context = null
		window.scrollTo 0, 0 # weird page bug

	# do something with errors
	ctx.error = (status, msg) ->
		if _.isString(status) and !msg? then [msg, status] = [status, 500]
		ctx.trigger "error", status, msg
		console.warn "RouterError: #{status} #{msg}"

	# redirect to a url on this domain
	ctx.redirect = app.goto

	# reload the current context
	ctx.reload = -> app.goto ctx.path

	# close old and add new
	__router_context.close() if __router_context?
	__router_context = ctx

	# continue
	next()

# app methods
app.route = -> page.apply null, arguments
app.goto = (route) -> page(route) if _.isString(route)
app.reload = -> page location.pathname + location.search

# pre routing API just because
preroutes = []

page "*", (ctx, next) ->
	index = 0
	(_next = (err) ->
		return next(err) if err

		route = preroutes[index++]
		return next() unless route?

		# test path against pathname
		r = new page.Route route.path
		return _next() unless r.match ctx.pathname, []

		# run route
		route.fn(ctx, _next)
		return
	)()
	return

app.preroute = (path, fn) ->
	[fn, path] = [path, "*"] if _.isFunction(path) and !fn?
	preroutes.push { fn, path }

# Go, Go, Go!
app.ready ->
	# a final 404 route
	page "*", (ctx) -> ctx.error 404, "Not Found"

	# launch the router
	page.start()
