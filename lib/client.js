var events = require('events');
var util = require('util');
var url = require('url');
var request = require('request');
var Admin = require('./admin');
var io = require('socket.io-client');

/**
 * A Respoke client emits the following events
 * 
 * ### connect
 * ### disconnect
 * ### reconnect
 * ### reconnecting
 * ### message
 * ### error
 * 
 * 
 * @param {object} options
 * @param {string} options.appId required 
 * @param {string} options.token required And endpoint authentication token 
 * @param {string} options.developmentMode=false optional but when true makes options.endpointId required 
 * @param {string} options.endpointId required if developmentMode is true
 * @param {string} options.baseURL optional
 */
function Client(options) {
    var self = this;
    options.developmentMode = options.developmentMode || false;

    events.EventEmitter.call(this);

    if (!options.appId) {
        process.nextTick(function () {
            self.emit('error', { error: "options.appId is required to make a client" });
        });
    }
    else if (!options.token && !options.developmentMode) {
        process.nextTick(function () {
            self.emit('error', { error: "options.token is required to make a client" });
        });
    } 
    else if (options.developmentMode && !options.endpointId) {
        process.nextTick(function () {
            self.emit('error', { error: "options.endpointId is required to make a client while in developmentMode" });
        });
    }

    self.options = options;
    self.appToken = null;
    self.endpointId = null;
    self.connectionId = null;

    self.baseURL = options.baseURL || "https://api.respoke.io/v1";

    var connected = false;
    self._setConnected = function (boolConnected) {
        connected = boolConnected;
    };
    /**
     * 
     * @returns {boolean} indicating connection status
     */
    self.isConnected = function () {
        return connected;
    };

    if (!options.developmentMode) {
        process.nextTick(function () {
            self.connect();
        });
    }
    else {
        request({
            uri: self.baseURL + "/tokens",
            method: "POST",
            json: true,
            body: {
                endpointId: options.endpointId,
                appId: options.appId,
                ttl: 60 * 60 * 6
            }
        }, function (err, res, body) {
            if (err) {
                self.emit('error', err);
                return;
            }
            if (res.statusCode !== 200) {
                self.emit('error', body || "Unable to connect with those parameters");
            }
            self.options.token = body.tokenId;
            self.connect();
        });
    }
    
    return self;
}
util.inherits(Client, events.EventEmitter);

Client.prototype.socket = null;

Client.prototype.connect = function () {
    var self = this;

    var connectParams = {
        'connect timeout': 2000,
        'force new connection': true, // Don't try to reuse old connection.
        'sync disconnect on unload': true, // have Socket.io call disconnect() on the browser unload event.
    };

    request({
        uri: self.baseURL + '/appauthsessions',
        method: "POST",
        json: true,
        body: {
            tokenId: self.options.token
        }
    }, function (err, res, body) {

        if (err) {
            self.emit('error', err);
            return;
        }
        if (res.statusCode !== 200) {
            self.emit('error', body || "Unable to obtain app auth session");
            return;
        }
        
        self.appToken = body.token;

        var nopathUrl = self.baseURL.substring(0, self.baseURL.length - 3); // split off the api version
        var connectionString = nopathUrl + '?app-token=' + self.appToken;
        self.socket = io.connect(connectionString, connectParams);
        
        self.socket.on('connect', function () {
            self.wsCall('POST', '/v1/endpointconnections', undefined, function (err, data) {
                if (err) {
                    self.emit('error', err);
                    return;
                }
                console.log('wsCall', err, data);
                self.endpointId = data.endpointId;
                self.connectionId = data.id;
                self.emit('connect');
            });
        });
        self.socket.on('disconnect', function() {
            self._setConnected(false);
            self.emit('disconnect');
        });
        self.socket.on('reconnect', function (num) {
            self.emit('reconnect', num);
        });
        self.socket.on('reconnecting', function (num) {
            self.emit('reconnecting', num);
        });
        self.socket.on('error', function (err) {
            self.emit('error', err);
        });
        self.socket.on('connect_error', function (res) {
            self.emit('error', res);
        });
        self.socket.on('connect_timeout', function (res) {
            self.emit('error', res);
        });

    });
};

Client.prototype.getAllEndpoints = function (callback) {
    this.wsCall('GET', '/apps/' + this.options.appId + '/endpoints', {}, callback);
};


Client.prototype.wsCall = function (httpMethod, urlPath, data, callback) {
    var self = this;
    self.socket.emit(httpMethod.toLowerCase(), JSON.stringify({
        url: self.baseURL + urlPath,
        data: data,
        headers: {'App-Token': self.appToken}
    }), function (response) {
        try {
            response = JSON.parse(response);
        }
        catch (ignored) {
            callback(new Error("Server response could not be parsed!"));
        }

        if (response && response.error) {
            callback(new Error(response.error + ' (' + httpMethod + ' ' + urlPath + ')'));
            return;
        }
        callback(null, response);
    });
};

exports = module.exports = Client;
