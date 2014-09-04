var events = require('events');
var util = require('util');
var url = require('url');
var request = require('request');
var Admin = require('./admin');
var io = require('socket.io-client');
var debug = require('debug')('respoke-client');
var _ = require('lodash');

/**
 * A general purpose client for communicating with Respoke over REST and web sockets.
 *
 *      npm install respoke
 *  
 * ## Usage
 * 
 *      var Respoke = require('respoke');
 *      // . . .
 *      var respoke = new Respoke(opts);
 * 
 * @class respoke
 * @param {object} options - Optional
 * @param {object} options['Admin-Token'] - Optional auth header
 * @param {object} options['App-Secret'] - Optional auth header
 * @param {object} options['App-Token'] - Optional auth header
 * @param {string} options.baseURL=https://api.respoke.io/v1 - Optional
 */
function Client(options) {

    var self = this;
    events.EventEmitter.call(this);
    options = options || { };

    //
    // Properties
    //

    /**
     * Header tokens used when performing REST or web socket requests to Respoke.
     * @type {object}
     */
    self.tokens = { };
    /**
     * Header `Admin-Token`
     * @type {string}
     */
    self.tokens['Admin-Token'] = options['Admin-Token'] || null;
    /**
     * Header `App-Secret`
     * @type {string}
     */
    self.tokens['App-Secret'] = options['App-Secret'] || null;
    /**
     * Header `App-Token`
     * @type {string}
     */
    self.tokens['App-Token'] = options['App-Token'] || null;

    /**
     * If connected, this is the web socket connection ID with Respoke.
     * @type {string}
     */
    self.connectionId = null;

    /**
     * The base respoke api to use.
     * 
     * It should include the version with no trailing `/`.
     * 
     * @type {string}
     */
    self.baseURL = options.baseURL || "https://api.respoke.io/v1";
    

    /**
     * The web socket connection from socket.io.
     *
     * @type WebSocket
     * @private
     */
    self.socket = null;



    // 
    // REST calls
    // 

    /**
     * Send an HTTP call.
     * 
     * @param object params
     * @param function callback
     * @private
     */
    self.send = function (params, callback) {
        callback = callback || function (err, body) {};
        
        debug('request', params);

        request(params, function (err, res, body) {
            if (err) {
                debug('request error', body || res);
                return callback(err, body || res);
            }
            if (!err && res.statusCode !== 200) {
                err = new Error(body.error);
                debug('request status error', body || res);
                err.body = body;
                return callback(err, body || res);
            }
            callback(null, body);
        });
    };
    
    /**
     * Methods for obtaining auth credentials and connecting with Respoke.
     * @type {object}
     */
    self.auth = { };

    /**
     * Authenticate with full admin privileges.
     * 
     * Sets `respoke.tokens['Admin-Token']`
     * 
     * @param {object} opts - Required
     * @param {string} opts.username
     * @param {string} opts.password
     * @param {function} callback
     */
    self.auth.admin = function (opts, callback) {
        if (!opts.username) {
            return callback(new Error("Cannot authenticate without username"));
        }
        if (!opts.username) {
            return callback(new Error("Cannot authenticate without password"));
        }
            
        var authParams = {
            uri: self.baseURL + '/adminsessions',
            method: 'POST',
            json: true,
            body: {
                username: opts.username,
                password: opts.password
            }
        };

        self.send(authParams, function(err, body) {
            if (err) {
                return callback(err, body);
            }

            self.tokens['Admin-Token'] = body.token;
            callback(null, body);
        });
        
    };

    /**
     * As an endpoint, obtain an app auth session.
     * 
     * Sets `respoke.tokens['App-Token']`.
     * 
     * This token will allow connecting as a user over web socket without admin privileges.
     * 
     * In most cases, you will immediately call `.connect()`.
     * 
     * @param {object} opts
     * @param {string} opts.appAuthTokenId
     * @param {function} callback
     */
    self.auth.appAuthSession = function (opts, callback) {
        opts = _.defaults(opts, {
            appAuthTokenId: null
        });

        if (!opts.appAuthTokenId) {
            return callback(new Error("Cannot authenticate without appAuthTokenId"));
        }

        request({
            uri: self.baseURL + '/appauthsessions',
            method: "POST",
            json: true,
            body: {
                tokenId: opts.appAuthTokenId
            }
        }, function (err, body) {
            if (err) {
                return callback(err, body);
            }
            self['App-Token'] = body.token;
            callback(null, body);
        });
    };

    /**
     * As an admin (with `respoke.tokens['App-Token']` or `respoke.tokens['App-Secret']`),
     * obtain an `appAuthSessionId` which can be used to authenticate to Respoke as 
     * an endpoint.
     * 
     * @param {object} opts
     * @param {object} opts.appId required
     * @param {object} opts.endpointId required
     * @param {object} opts.roleId required unless app is in development mode
     * @param {object} opts.ttl=86400 optional seconds time-to-live
     * @param {object} opts.auth['App-Secret'] optional override
     * @param {object} opts.auth['Admin-Token'] optional override
     * @param {function} callback - (err, clientAuthData)
     */
    self.auth.endpoint = function (opts, callback) {
        opts = _.defaults(opts, {
            appId: null,
            endpointId: null,
            roleId: null,
            ttl: 84600,
            auth: {
                'Admin-Token': self.tokens['Admin-Token'],
                'App-Secret': self.tokens['App-Secret']
            }
        });

        if (!opts.appId) {
            return callback(new Error("Cannot authenticate endpoint when appId is " + opts.appId));
        }
        if (!opts.endpointId) {
            return callback(new Error("Cannot authenticate endpoint when endpointId is " + opts.endpointId));
        }

        var requestOptions = {
            uri: self.baseURL + '/tokens',
            method: 'POST',
            headers: opts.auth,
            json: true,
            body: opts
        };

        self.send(requestOptions, callback);
    };

    /**
     * Connect as a web socket client using the highest authentication token
     * currently available.
     * 
     * After calling this, listen for `respoke.on('connect')`.
     * 
     * @param {object} opts
     * @param {string} opts['Admin-Token']
     * @param {string} opts['App-Secret']
     * @param {string} opts['App-Token']
     * @param {object} opts.connectParams - optional Socket.io connection parameters
     */
    self.auth.connect = function (opts) {
        opts = _.defaults(opts, {
            'Admin-Token': self.tokens['Admin-Token'],
            'App-Secret': self.tokens['App-Secret'],
            'App-Token': self.tokens['App-Token'],
            connectParams: {
                'connect timeout': 2000,
                'force new connection': true, // Don't try to reuse old connection.
                'sync disconnect on unload': true, // have Socket.io call disconnect() on the browser unload event.
            }
        });

        if (!opts['Admin-Token'] && !opts['App-Secret'] && !opts['App-Token']) {
            return self.emit('error', {message: "Cannot connect without any auth tokens"});
        }

        var tokenQS = "?";
        if (opts['Admin-Token']) {
            tokenQS += "Admin-Token=" + opts['Admin-Token'];
        }
        else if (opts['App-Secret']) {
            tokenQS += "App-Secret=" + opts['App-Secret'];
        }
        else if (opts['App-Token']) {
            tokenQS += "App-Token=" + opts['App-Token'];
        }

        var nopathUrl = self.baseURL.substring(0, self.baseURL.length - 3); // split off the api version
        var connectionString = nopathUrl + tokenQS;
        self.socket = io.connect(connectionString, opts.connectParams);
        
        self.socket.on('connect', function () {
            self.wsCall('post', '/endpointconnections', null, function (err, data) {
                if (err) {
                    self.emit('error', err);
                    return;
                }
                self.endpointId = data.endpointId;
                self.connectionId = data.id;
                /**
                 * Connected to respoke.
                 * @event connect
                 */
                self.emit('connect');
            });
        });
        self.socket.on('disconnect', function() {
            debug('socket disconnect', res);
            /**
             * Disconnected from respoke.
             * @event disconnect
             */
            self.emit('disconnect');
        });
        self.socket.on('reconnect', function (num) {
            debug('socket reconnect', res);
            /**
             * Reconnected with respoke.
             * @event reconnect
             */
            self.emit('reconnect', num);
        });
        self.socket.on('reconnecting', function (num) {
            debug('socket reconnecting', res);
            /**
             * Reconnecting with respoke.
             * @event reconnecting
             */
            self.emit('reconnecting', num);
        });
        self.socket.on('error', function (err) {
            debug('socket error', res);
            /**
             * An error occurred.
             * @event error
             * @property {object} err
             */
            self.emit('error', err);
        });
        self.socket.on('connect_error', function (err) {
            debug('socket connect_error', res);
            self.emit('error', err);
        });
        self.socket.on('connect_timeout', function (res) {
            debug('socket connect_timeout', res);
            self.emit('error', res);
        });
        self.socket.on('message', function (msg) {
            debug('message', res);
            /**
             * There is an incoming private message, from an endpoint.
             * @event message
             * @property object msg
             */
            self.emit('message', msg);
        });
        self.socket.on('presence', function (res) {
            debug('presence', res);
            /**
             * Presence for an endpoint has changed or is now available.
             * @event presence
             * @property object res
             */
            self.emit('presence', res);
        });
        self.socket.on('join', function (res) {
            debug('join', res);
            res.header.groupId = res.header.channel;
            delete res.header.channel;
            /**
             * An endpoint (which can include this client) has joined a group.
             * @event join
             * @property object res
             */
            self.emit('join', res);
        });
        self.socket.on('leave', function (res) {
            debug('leave', res);
            res.header.groupId = res.header.channel;
            delete res.header.channel;
            /**
             * An endpoint (which can include this client) has left a group.
             * @event leave
             * @property object res
             */
            self.emit('leave', res);
        });
        self.socket.on('pubsub', function (res) {
            debug('pubsub', res);
            res.header.groupId = res.header.channel;
            delete res.header.channel;
            /**
             * A group message has been received.
             * @event pubsub
             * @property object res
             */
            self.emit('pubsub', res);
        });
    };

    /**
     * Get an app auth token as an endpoint in **development mode**.
     * 
     * The response `{ tokenId: 'XXXX-XXXX-XXXX-XXXX' } can then be used with `.authenticate.endpoint()`.
     * 
     * @param {object} opts
     * @param {string} opts.endpointId
     * @param {string} opts.appId
     * @param {number} opts.ttl=60*60*6 - Seconds for the tokenId to live.
     * @param {function} callback - (err, body)
     */
    self.auth.developmentMode = function (opts, callback) {
        opts = _.defaults(opts, {
            ttl: 60 * 60 * 6
        });

        if (!opts.endpointId) {
            return callback(new Error("Cannot authenticate without endpointId"));
        }
        if (!opts.appId) {
            return callback(new Error("Cannot authenticate without endpointId"));
        }

        self.send({
            uri: self.baseURL + "/tokens",
            method: "POST",
            json: true,
            body: opts
        }, callback);
    };



    
    //
    // Web socket calls
    //

    /**
     * Make a web socket call over the active `.socket`.
     * 
     * @param string httpMethod
     * @param string urlPath - Relative to `baseUrl`
     * @param object data - Optional; to be sent over web socket
     * @param function callback
     * @private
     */
    self.wsCall = function (httpMethod, urlPath, data, callback) {
        callback = callback || function (err, res) { };

        var wsBody = {
            url: self.baseURL + urlPath,
            headers: self.tokens
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

    self.close = function (callback) {
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

                self.connectionId = null;
                self.socket.removeAllListeners();
                self.socket.disconnect();
                callback(null);
            });
        });
    };

    /**
     * Methods for interacting with presence indication.
     * @type {object}
     */
    self.presence = { };
    /**
     * Register as an observer of presence for the specified endpoint ids.
     * 
     * @param {array<string>} endpoints
     * @param {function} callback
     */
    self.presence.observe = function (endpoints, callback) {
        this.wsCall('post', '/presenceobservers', {endpointList: endpoints}, callback);
    };
    /**
     * Set the presence for this endpoint, if connected.
     * 
     * @param {object} params
     * @param {string|number|object|array} params.presence - Your presence object
     * @param {string} params.status - Human readable status message
     * @param {function} callback
     */
    self.presence.set = function (params, callback) {
        var body = {
            presence: {
                show: params.show || true,
                status: params.status,
                type: params.presence || "available"
            }
        };
        this.wsCall('post', '/presence', body, callback);
    };
    /**
     * Send a message to an endpoint or specific connection of an endpoint.
     * 
     * Only one of these is required.
     * - `params.endpointId`
     * - `params.connectionId`
     * 
     * @param {object} params
     * @param {string} params.endpointId
     * @param {string} params.connectionId
     * @param {string} params.message required
     */
    self.sendMessage = function (params, callback) {
        if (!params.endpointId && !params.connectionId) {
            callback(new Error("Cannot send message without endpointId or connectionId"));
        }
        self.wsCall('post', '/messages', {
            to: params.endpointId,
            toConnection: params.connectionId,
            message: params.message
        }, callback);
    };

    self.group = { };

    /**
     * Send a message to a group.
     * 
     * @param object params
     * @param string params.groupId
     * @param string params.message
     */
    self.group.sendMessage = function (params, callback) {
        if (!params.groupId) {
            return callback(new Error("Cannot send group message without groupId"));
        }
        this.wsCall('post', '/channels/' + params.groupId + '/publish', {
            endpointId: this.endpointId,
            message: params.message
        }, callback);
    };

    /**
     * Get the members of a group.
     * 
     * @param object params
     * @param string params.groupId
     * @param function callback
     */
    self.group.getMembers = function (params, callback) {
        callback = callback || function (err, groupMembers) { };

        if (!params.groupId) {
            return callback(new Error("Cannot get group members without groupId"));
        }
        self.wsCall('get', '/channels/' + params.groupId + '/subscribers', null, callback);
    };
    /**
     * Join a group.
     * @param {object} params
     * @param {string} params.groupId
     * @param {function} callback
     */
    self.group.join = function (params, callback) {
        callback = callback || function (err) { };

        if (!params.groupId) {
            return callback(new Error("Cannot join group without groupId"));
        }
        self.wsCall('post', '/channels/' + params.groupId + '/subscribers', null, callback);
    };
    /**
     * Leave a group.
     * @param {object} params
     * @param {string} params.groupId
     * @param {function} callback
     */
    self.group.leave = function (params, callback) {
        if (!params.groupId) {
            return callback(new Error("Cannot leave group without groupId"));
        }
        self.wsCall('delete', '/channels/' + params.groupId + '/subscribers', callback);
    };


    return self;
}
util.inherits(Client, events.EventEmitter);


exports = module.exports = Client;
