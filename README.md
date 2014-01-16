# AntiGravity.js
**Note: This is provided for demo purposes only. If you must use it, do so at your own risk.**
## Description
A Model-View-Controller + Router JavaScript Framework that is super-lite and a work in progress.
The goal is to allow Single Page Apps with expressive and well-organized code adhering to separation of
concerns.
## Demo
Click [here](http://litenotes.heroku.com) to see a very basic notes web app made using the custom framework.
## How it Works
This Framework was inpsired by the Rails gem for Ruby, and tries to follow its lead in MVC + Routers.
#### Models
Models have `.pojos` which tracks all fetched model objects.
Model is initialized with singleURL (for CRUD on single objects), and allURL (read lots of objects at once).
`YourModel.fetchAllWhere(optionsObject, callback)` will do an AJAX GET request to the allURL specified
passing params based on the optionsObject.
`YourModel.singleSave(object, callback)` will do an AJAX POST request to the singleURL specified passing
object as params.
#### Controllers
Controllers are your place to specify methods that the router should be calling when certain actions occur.
#### Views
Views are initialized with a renderId (this is the id of the `<render>` tag you add to your HTML). Any
  attributes that you wish to replace inside this render tag must be specified on initialization.
  For example: `<render id="some-id">Welcome, {{ name }}!</render>` would require name to be specified in the
  view initialization and renderId to be specified as "some-id".
  To render simply call: `YourView.renderView()`. Note: If this is a callback you must bind 'YourView' to
  renderView in order to retain the correct context.
  Additionally there is the `<partial>` tag, also given an id and accessed through
  `YourView.renderViewPartial(partialId, object)` where the object contains any attributes required by the partial (ie attributes inside double brackets). If you specify methods for your view you can call them inside double brackets, making partials very useful for repeating segments of HTML.
#### Routes
Routes match events from views to actions on specified controllers. An HTML element is given a route
attribute in JSON parseable form, eg: `<p route='{"dblclick": ":id/select" path-id="{{ id }}"}'>`.  Your router will then attack
  an event handler of each type specified in the keys of the object you set as the route attribute
  (in the example above, this would be ondblclick). When initializing the router you would pass an object
  containing `":id/select": YourController.someMethod`. The router will call the controller method and pass it
  a params object and the event.  The params object is populated by looking at the values of all child
  elements with a name attribute specified, and the value of the event target if it has a name specified. Lastly the params object is given keys corresponding to items prefixed with colons in the route (id from the example above).  It seeks the value by looking for an attribute on the event target element called
  path-attributeName (path-id for example above).