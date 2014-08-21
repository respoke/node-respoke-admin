var events = require('events');
var util = requier('util');
var socketioClient = require('socket.io-client');

/**
 * @param {object} options
 * @param {string} options.baseURL optional
 */
function Client(options) {
    events.EventEmitter.call(this);

    var self = this;
    self.baseURL = options.baseURL || "https://api.respoke.io/v1";
    
    return self;
}
util.inherits(Client, events.EventEmitter);

Client.prototype.socket = null;

Client.prototype.connect = function () {
    this.socket = socketioClient(self.baseURL);
    
    this.socket.on('connect', function() {
        socket.on('event', function(data) {

        });
        socket.on('disconnect', function() {

        });
    });
};



exports = module.exports = Client;
