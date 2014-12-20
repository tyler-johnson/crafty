var EventEmitter = require("events").EventEmitter;

function World() {

}

exports.World = World;
World.prototype = Object.create(EventEmitter.prototype);