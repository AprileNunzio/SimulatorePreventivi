const EventEmitter = require('events');

class AppEventBus extends EventEmitter {}

const eventBus = new AppEventBus();
eventBus.setMaxListeners(50);

module.exports = eventBus;
