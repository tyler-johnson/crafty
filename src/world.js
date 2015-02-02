var Events = require("backbone").Events;

function World() {

}

exports.World = World;

_.extend(World.prototype, Events);