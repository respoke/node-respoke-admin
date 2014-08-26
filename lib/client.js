var events = require('events');
var util = require('util');
var url = require('url');
var request = require('request');
var Admin = require('./admin');
var io = require('socket.io-client');
var debug = require('debug')('respoke-client');

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

    if (!options.developmentMode && options.token) {
        process.nextTick(function () {
            self.connect();
        });
    }
    // dev mode - get a token
    else if (options.developmentMode) {
        debug('request for dev mode token');
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
    // else error will be emitted
    
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
            self.wsCall('post', '/endpointconnections', null, function (err, data) {
                if (err) {
                    self.emit('error', err);
                    return;
                }
                self.endpointId = data.endpointId;
                self.connectionId = data.id;
                self.emit('connect');
            });
        });
        self.socket.on('disconnect', function() {
            debug('socket disconnect', res);
            self._setConnected(false);
            self.emit('disconnect');
        });
        self.socket.on('reconnect', function (num) {
            debug('socket reconnect', res);
            self.emit('reconnect', num);
        });
        self.socket.on('reconnecting', function (num) {
            debug('socket reconnecting', res);
            self.emit('reconnecting', num);
        });
        self.socket.on('error', function (err) {
            debug('socket error', res);
            self.emit('error', err);
        });
        self.socket.on('connect_error', function (res) {
            debug('socket connect_error', res);
            self.emit('error', res);
        });
        self.socket.on('connect_timeout', function (res) {
            debug('socket connect_timeout', res);
            self.emit('error', res);
        });
        self.socket.on('message', function (res) {
            debug('message', res);
            self.emit('message', res);
        });
        self.socket.on('pubsub', function (res) {
            // normalize pubsub response
            debug('pubsub', res);
            self.emit('message', {
                header: {
                    type: res.header.type,
                    from: res.header.from,
                    fromConnection: res.header.fromConnection,
                    groupId: res.header.channel
                },
                body: res.message
            });
        });

    });
};

Client.prototype.close = function (callback) {
    var self = this;
    self.wsCall('delete', '/endpointconnections/' + self.endpointId, null, function (err) {
        if (err) {
            debug('Warning: could not delete endpoint connection', err);
        }

        request({
            method: 'delete',
            uri: self.baseURL + '/appauthsessions',
            json: true
        }, function (err, res, body) {
            if (err) {
                debug('Warning: delete appauthsessions', err);
                return callback(err);
            }
            if (res.statusCode !== 200) {
                debug('Warning: delete appauthsessions', res.body);
            }

            self.socket.removeAllListeners();
            self.socket.disconnect();
            callback();
        });
    });
};

/**
 * Register as an observer of presence for the specified endpoint ids.
 * 
 * @param {array<string>} endpoints
 */
Client.prototype.registerPresence = function (endpoints, callback) {
    this.wsCall('post', '/presenceobservers', endpoints, callback);
};

/**
 * Send a message to an endpoint or specific connection of an endpoint.
 * 
 * @param {object} params
 * @param {string} params.endpointId required unless `params.groupId` is used
 * @param {string} params.groupId required unless `params.endpointId` is used
 * @param {string} params.connectionId optional
 * @param {string} params.message required
 */
Client.prototype.sendMessage = function (params, callback) {
    if (params.endpointId || params.connectionId) {
        this.wsCall('post', '/messages', {
            to: params.endpointId,
            toConnection: params.connectionId,
            message: params.message
        }, callback);
    }
    if (params.groupId) {
        this.wsCall('post', '/channels/' + params.groupId + '/publish', {
            endpointId: this.endpointId,
            message: params.message
        }, callback);
    }
};

/**
 * Get the members of a group.
 * 
 * @param {object} params
 * @param {string} params.groupId
 */
Client.prototype.getGroupMembers = function (params, callback) {
    if (!params.groupId) {
        return callback(new Error("Cannot get group members without groupId"));
    }
    this.wsCall('get', '/channels/' + params.groupId + '/subscribers', null, callback);
};

Client.prototype.getAllSubscribers = function (callback) {
    this.getGroupMembers({ groupId: 'endpointList' }, callback);
};

/**
 * Join a group.
 * @param {object} params
 * @param {string} params.groupId
 */
Client.prototype.join = function (params, callback) {
    if (!params.groupId) {
        return callback(new Error("Cannot join group without groupId"));
    }
    this.wsCall('post', '/channels/' + params.groupId + '/subscribers', null, callback);
};

/**
 * Leave a group.
 * @param {object} params
 * @param {string} params.groupId
 */
Client.prototype.leave = function (params, callback) {
    if (!params.groupId) {
        return callback(new Error("Cannot leave group without groupId"));
    }
    this.wsCall('delete', '/channels/' + params.groupId + '/subscribers', callback);
};

Client.prototype.wsCall = function (httpMethod, urlPath, data, callback) {
    callback = callback || function () {};
    var self = this;
    var wsBody = {
        url: self.baseURL + urlPath,
        headers: {'App-Token': self.appToken}
    };
    if (data) {
        wsBody.data = data;
    }
    debug('socket', httpMethod, self.baseURL + urlPath, data);
    self.socket.emit(httpMethod.toLowerCase(), JSON.stringify(wsBody), function (response) {
        try {
            response = JSON.parse(response);
        }
        catch (ignored) {
            debug('Server response could not be parsed as JSON', response);
            return callback(new Error("Server response could not be parsed!"));
        }

        if (response && response.error) {
            debug('socket response error', response);
            return callback(new Error(response.error + ' (' + httpMethod + ' ' + urlPath + ')'));
        }
        callback(null, response);
    });
};

exports = module.exports = Client;
