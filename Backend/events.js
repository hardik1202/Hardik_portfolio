// events.js — Practical 10: Dedicated EventEmitter module
// Uses Node.js built-in 'events' module (no external dependencies)

const EventEmitter = require('events');

class TaskEvents extends EventEmitter {}

// Export a singleton instance so every module shares the same emitter
module.exports = new TaskEvents();
