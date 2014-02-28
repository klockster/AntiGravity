# AntiGravityMVX.js
**Note: This is provided for demo purposes only. If you must use it, do so at your own risk.**
## Description
An MV* JavaScript framework that is lite, powerful, and a work in progress.
The goal is to allow Single Page Apps with expressive and well-organized code adhering to separation of
concerns.  Tested and working in latests versions of Chrome, Firefox, and IE.
## Demo
Click [here](http://www.ryanklock.com/antigravity.html) to see some demos and features of this framework.
Click [here](http://tumblrish.herokuapp.com/?demo=true) to see a Single Page App built with the framework that clones several features of sites like Tumblr.
## How it Works
This framework was my fun and challenging attempt to replicate what I thought were the most useful features of several popular JS MV* frameworks. 
It's a purely academic project of a junior level developer, but also pretty neat if I do say so myself.
#### Models
Models have a `.pojos` property which tracks all fetched model objects. They are also blessed with convenience methods for fetching (from a server), 
finding (withing fetched objects), saving, updating, and destroying objects.  Can also setup Rails-like associations between models via `hasMany()` and 
`belongsTo()`.
#### Views
Views are controlled by `<render>` tags for reliable viewspaces and `<partial>` tags for reusable DOM markup. Partials are essentially your templates, which are 
rendered by the Crosses.  So you might see something like this `<partial id="post"><h2>{{ title }}</h2><p>{{ body }}</p></partial>` which would be a template for a post, 
and the Cross responsible for rendering it would have to have access to an object with "title" and "body" properties.
#### Crosses
Crosses are a cross (haha) between a View-Model and a Controller, and function to crosslink Views to themselves, Views to other Views, Models to Views, and more. 
Crosses are where you specify the methods that will control which partials will be tied with which objects and sent into the DOM inside a `<render>` tag.

## Upcoming Changes
* Refactor and DRY!
* Get rid of all dependencies on jQuery (which is merely used for AJAX calls right now).
* Give more precise control of rerendering when Model objects are updated.