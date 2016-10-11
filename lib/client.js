/*
 * Copyright 2014, Digium, Inc.
 * All rights reserved.
 *
 * This source code is licensed under The MIT License found in the
 * LICENSE file in the root directory of this source tree.
 *
 * For all details and documentation:  https://www.respoke.io
 */
/* global Promise: true */
'use strict';

var Promise = require('es6-promise').Promise;
var nodeify = require('nodeify');
var events = require('events');
var util = require('util');
var request = require('request');
var io = require('socket.io-client');
var debug = require('debug')('respoke-client');
var _ = require('lodash');
var errors = require('./utils/errors');
var url = require('url');
var packageVersion = require('../package.json').version;
var os = require('os');
var osName = require('os-name');

var sdkPart = 'Respoke-Node.js/' + packageVersion;
var osPart = osName(os.platform(), os.release());
var nodePart = 'Node.js/' + process.version;
var sdkHeader = { 'Respoke-SDK': sdkPart + ' (' + osPart + ') ' + nodePart };
/**
 * Determine whether the specified statusCode indicates a successful HTTP request.
 *
 * @param {number} statusCode The status code to check
 * @returns {boolean} Whether the statusCode is a 2xx status code.
 * @private
 */
function isOk(statusCode) {
    return statusCode >= 200 && statusCode < 300;
}

/**
 * # [Respoke](https://www.respoke.io) for Node
 * [![NPM version](https://badge.fury.io/js/respoke-admin.svg)](http://badge.fury.io/js/respoke-admin)
 * [![Build Status](https://travis-ci.org/respoke/node-respoke-admin.svg)](https://travis-ci.org/respoke/node-respoke-admin)
 * [![Dependency Status](https://david-dm.org/respoke/node-respoke-admin.svg)](https://david-dm.org/respoke/node-respoke-admin)
 * [![devDependency Status](https://david-dm.org/respoke/node-respoke-admin/dev-status.svg)](https://david-dm.org/respoke/node-respoke-admin#info=devDependencies)
 *
 * ## Setup
 *
 * Install using npm.
 *
 * ```bash
 * npm install --save respoke-admin
 * ```
 *
 * For more details on the node-respoke API see the
 * [project documentation][node-respoke-admin]. For more on the Respoke service and
 * how it works see the [full documentation][respoke-docs].
 *
 * [node-respoke-admin]: https://respoke.github.io/node-respoke-admin "node-respoke-admin documentation"
 * [respoke-docs]: https://docs.respoke.io "full respoke documentation"
 *
 * ## Debugging
 *
 * This library uses the `debug` npm module. To enable debugging output, use the following
 * environment variable:
 *
 * ```bash
 * DEBUG=respoke-client
 * ```
 *
 * ## Error handling
 *
 * A respoke `client` inherits from `EventEmitter`.
 *
 * ```javascript
 * client.on('error', function (err) { console.error(err); });
 * ```
 *
 * If you fail to listen for the error event, **errors will be thrown** so they are not
 * buried.
 *
 * ## Testing
 *
 * Before you can run the functional tests you will need to complete the following
 * steps.
 *
 * - create a test app in the your admin portal at [respoke.io][respoke]
 * - turn *off* dev mode
 * - create a new blank role (name value is not important)
 * - `cp spec/helpers.example.js spec/helpers.js`
 * - fill in the information in the `spec/helpers.js` file
 *
 * There are several commands to run the tests.
 *
 * ```bash
 * # run all tests
 * npm test
 *
 * # run all tests with extra debug output
 * npm run debug-test
 *
 * # run only unit tests
 * npm run unit
 *
 * # run only functional tests
 * npm run functional
 * ```
 *
 * #### Building and viewing the source documentation
 *
 * ```bash
 * npm run docs
 * ```
 *
 * ----
 * ## Respoke Authentication
 * There are multiple levels of authentication to Respoke, depending on your use case.
 * In general, the hierarchy of credentials is as follows:
 *
 * > 1. "Admin-Token" (full account administrator)
 *
 * > 2. "App-Secret" (app level administration)
 *
 * > 3. "App-Token" (endpoint / end user)
 *
 * ----
 * ## Examples
 *
 *
 * ### Instantiate a client with an `App-Secret`
 *
 *      var Respoke = require('respoke-admin');
 *      var admin = new Respoke({
 *          // from the Respoke developer console under one of your apps
 *          appId: "XXXX-XXX-XXXXX-XXXX",
 *          'App-Secret': 'XXXX-XXXXX-XXX-XXXXXXXX',
 *          // if the respoke socket is lost, keep trying to reconnect automatically
 *          autoreconnect: true
 *      });
 *
 *      // connect to respoke
 *      // provide an `endpointId` for receiving messages
 *      admin.auth.connect({ endpointId: "superWombat"});
 *      admin.on('connect', function () {
 *          console.log('admin is connected to respoke');
 *      });
 *      admin.on('message', function (message) {
 *          if (message.endpointId === 'billy') {
 *              console.log('message from billy', message);
 *          }
 *      });
 *
 * ### Obtain a session token for an endpoint
 *
 *      admin.auth.endpoint({
 *          endpointId: "billy",
 *          roleId: "XXXX-XXX-XXXXX-XXXX"
 *      }, function (err, authData) {
 *          if (err) { console.error(err); return; }
 *
 *          // Now we have a token for an end user to authenticate as an endpoint.
 *          console.log(authData.tokenId); // "XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
 *          var billy = new Respoke({ appId: 'XXXX-XXXXX-XXXX-XXX' });
 *
 *          billy.auth.sessionToken({ tokenId: authData.tokenId }, function (err, sessionData) {
 *              if (err) { console.error(err); return; }
 *
 *              // Now we have a session token from `sessionData.token`.
 *              // However, for our purposes, there is no need to do anything with it because
 *              // the library caches it automatically at `billy.tokens['App-Token']`, and
 *              // uses it when it needs it.
 *              billy.auth.connect();
 *
 *              // Respoke is an EventEmitter
 *              billy.on('connect', function () {
 *                  console.log('connected to respoke!');
 *                  billy.messages.send({
 *                      to: 'superWombat',
 *                      message: 'Hi wombat'
 *                  });
 *              });
 *
 *          });
 *      });
 * ----
 *
 * @class respoke
 * @param {object} options - Optional
 * @param {string} options.appId - Optional
 * @param {string} options['Admin-Token'] - Optional header, if you already authenticated
 * @param {string} options['App-Secret'] - Optional header, from Respoke dev console
 * @param {string} options['App-Token'] - Optional header, if you already authenticated
 * @param {string} options.endpointId - Optional endpointId to use when connecting via web socket
 * using auth scheme which does not imply an endpointId (i.e. App-Secret)
 * @param {boolean} options.autoreconnect=false - Optional flag to automatically reconnect to
 * respoke if a web socket connection becomes active, then is lost. This will throw an error
 * when attempting to reconnect if specified without an App-Secret.
 * @param {string} options.baseURL=https://api.respoke.io/v1 - Optional
 * @param {object} options.socket - Optional, overrides the default socket.io client
 */
function Client(options) {

    var self = this;
    events.EventEmitter.call(this);
    options = options || { };

    /**
     * Boolean indicating whether to keep trying to reinitate a web socket to respoke when
     * using an App-Secret for auth. Defaults false.
     * @type {boolean}
     * @private
     */
    self.autoreconnect = !!options.autoreconnect;
    /**
     * Milliseconds to wait before attempting to reauthorize with respoke using App-Secret to
     * make a web socket connection.
     * @type {integer} milliseconds
     * @private
     */
    self.autoreconnectInterval = 1000;
    /**
     * Timeout ID returned from `setTimeout()` when attempting to reauthorize with respoke
     * using App-Secret to make a web socket connection.
     * @type {number} timeoutID
     * @private
     */
    self.autoreconnectTimeout = null;
    /**
     * Internal handler for reauthing and connecting via web socket to respoke with App-Secret.
     * @private
     */
    self._attemptAutoreconnect = function _attemptAutoreconnect() {
        debug('attempting autoreconnect', self._attemptAutoreconnect.callCount);
        self.clearAutoreconnectTimeout();
        self.autoreconnectInterval = self.autoreconnectInterval * 2;
        if (self.autoreconnectInterval > 60000) {
            self.autoreconnectInterval = 60000;
        }
        function onErrorTryAgain() {
            self.autoreconnectTimeout = setTimeout(function () {
                self._attemptAutoreconnect();
            }, self.autoreconnectInterval);
        }
        self.auth.connect();
        self.socket.once('error', onErrorTryAgain);
        self.socket.once('connect', function onAutoreconnectConnectEvent() {
            self.socket.removeListener('error', onErrorTryAgain);
            self.clearAutoreconnectTimeout();
            self.autoreconnectInterval = 1000;
        });
    };
    /**
     * function to prevent leaks by clearing any reconnection timeouts.
     * @private
     */
    self.clearAutoreconnectTimeout = function clearAutoreconnectTimeout() {
        if (self.autoreconnectTimeout) {
            clearTimeout(self.autoreconnectTimeout);
            self.autoreconnectTimeout = null;
        }
    };
    /**
     * socketIOConnectParams are re-used when doing an autoreconnect.
     * @private
     */
    self.socketIOConnectParams = null;
    /**
     * Container object for header tokens.
     * These are used when performing REST or web socket requests to Respoke.
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
     * App id
     * @type {string}
     */
    self.appId = options.appId || null;

    /**
     * If connected, this is the web socket connection ID with Respoke.
     * @type {string}
     */
    self.connectionId = null;
    /**
     * If connected, this is the endpointId. Stored endpointId for use when connecting
     * with App-Secret via web socket (when not a specific endpoint).
     * @type {string}
     */
    self.endpointId = options.endpointId || null;

    /**
     * The base respoke api to use. In most circumstances there is no reason
     * to change this.
     *
     * It should include the API version with no trailing `/`.
     *
     * `https://api.respoke.io/v1`
     *
     * @type {string}
     */
    self.baseURL = options.baseURL || "https://api.respoke.io/v1";

    /**
     * The web socket connection instance from socket.io. It is recommended that
     * you do not access this directly.
     *
     * @type {SocketObject}
     */
    self.socket = options.socket ? options.socket : null;

    /**
     * General purpose method for doing a REST call to Respoke.
     *
     * @param {object} params
     * @param {object} params.body
     * @param {boolean} params.json=true
     * @param {object} params.headers=self.tokens
     * @param {function} callback (err, body)
     */
    self.request = function (params, callback) {
        params = _.defaults(params || {}, {
            json: true,
            headers: self.tokens
        });

        params.headers = _.assign({}, params.headers, sdkHeader);

        debug('request', params);

        request(params, callback);
    };

    /**
     * Make a general purpose web socket call over the active `.socket`.
     *
     * @param {string} httpMethod
     * @param {string} urlPath - Relative to `baseUrl`
     * @param {object} data - Optional; to be sent over web socket
     * @param {object} [data.headers] - Optional WS header object
     */
    self.wsCall = function (httpMethod, urlPath, data) {
        data = data || {};
        // Defaults to App-Token header since that will have an associated endpoint
        var headers = {};

        if (self.tokens['App-Token']) {
            headers['App-Token'] = self.tokens['App-Token'];
        }
        // Be sure to set own endpointId when not using App-Token.
        else {
            headers = self.tokens;
        }

        if (!headers['App-Token'] && headers['App-Secret'] && self.endpointId && !data.endpointId) {
            data.endpointId = self.endpointId;
        }

        var wsBody = {
            url: self.baseURL + urlPath,
            headers: _.assign({}, headers, sdkHeader),
            data: data
        };

        return new Promise(function (resolve, reject) {
            debug('socket send ' + httpMethod, wsBody);
            self.socket.emit(httpMethod.toLowerCase(), JSON.stringify(wsBody), function (response) {
                if (typeof response === 'string') {
                    try {
                        response = JSON.parse(response);
                    }
                    catch (ignored) {
                        debug(
                            'socket response error',
                            'could not be parsed as JSON',
                            response,
                            httpMethod,
                            wsBody.url
                        );
                        reject(new errors.UnparseableResponse());
                        return;
                    }
                }

                if (response && response.error) {
                    debug('socket response error', {
                        response: response,
                        httpMethod: httpMethod,
                        url: wsBody.url,
                        requestHeaders: wsBody.headers
                    });
                    reject(new errors.SocketErrorResponseFromServer(
                        response,
                        httpMethod,
                        urlPath
                    ));
                    return;
                }

                debug('socket response ok', httpMethod, self.baseURL + urlPath, typeof response, response);
                resolve(response);
            });
        });
    };

    /**
     * Namespace object. The methods at `respoke.auth` are used for
     * obtaining auth credentials and connecting with Respoke.
     * @type {object}
     */
    self.auth = { };

    /**
     * As an admin (with `respoke.tokens['App-Token']` or `respoke.tokens['App-Secret']`),
     * obtain a `tokenId` which can be used to authenticate to Respoke as an endpoint.
     *
     *      respoke.auth.endpoint({
     *          endpointId: "user-billy",
     *          roleId: "XXXX-XXX-XXXXX-XXXX"
     *      }, function (err, authData) {
     *          if (err) { console.error(err); return; }
     *
     *          console.log(authData.tokenId); // "XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
     *      });
     *
     * @param {object} opts
     * @param {object} opts.appId required
     * @param {object} opts.endpointId required
     * @param {object} opts.roleId required unless app is in development mode
     * @param {object} opts.ttl=86400 optional seconds time-to-live
     * @param {object} opts.headers['App-Secret'] optional; override cached token
     * @param {object} opts.headers['Admin-Token'] optional; override cached token
     * @param {function} callback - (err, clientAuthData)
     */
    self.auth.endpoint = function (opts, callback) {
        opts = _.defaults(opts || {}, {
            appId: self.appId,
            endpointId: null,
            roleId: null,
            ttl: 84600
        });

        var requestOptions = {
            uri: self.baseURL + '/tokens',
            method: 'POST',
            headers: opts.headers,
            json: true,
            body: opts
        };

        if (callback) {
            nodeify(self.auth.endpoint(opts), callback);
            return;
        }

        return new Promise(function (resolve, reject) {
            if (!opts.appId) {
                return reject(new Error(
                    "Cannot authenticate endpoint when appId is " + opts.appId
                ));
            }
            if (!opts.endpointId) {
                return reject(new Error(
                    "Cannot authenticate endpoint when endpointId is " + opts.endpointId
                ));
            }

            self.request(requestOptions, function (err, res, body) {
                if (err) {
                    return reject(err);
                }

                if (!isOk(res.statusCode)) {
                    return reject(new errors.UnexpectedServerResponseError(res));
                }

                return resolve(body);
            });
        });
    };

    /**
     * As an endpoint, obtain an app auth session. This creates a session for the user
     * to connect to your Respoke app.
     *
     * Upon successful authentication, it sets the property `respoke.tokens['App-Token']`
     * which will be used during HTTP requests, or to establish a web socket.
     * `{ token: 'XXXX-XXX-XXXXX-XXXX' }`
     *
     * In most cases, you will immediately call `.connect()` to initiate the web socket.
     *
     * @param {object} opts required
     * @param {string} [opts.tokenId] required
     * @param {function} callback (err, body)
     */
    self.auth.sessionToken = function (opts, callback) {
        opts = _.defaults(opts || {}, {
            tokenId: null
        });

        if (callback) {
            nodeify(self.auth.sessionToken(opts), callback);
            return;
        }

        return new Promise(function (resolve, reject) {
            if (!opts.tokenId) {
                return reject(new Error("Cannot authenticate without tokenId"));
            }

            self.request({
                uri: self.baseURL + '/session-tokens',
                method: "POST",
                json: true,
                headers: {},
                body: {
                    tokenId: opts.tokenId
                }
            }, function (err, res, body) {
                if (err) {
                    return reject(err);
                }

                if (!isOk(res.statusCode)) {
                    return reject(new errors.UnexpectedServerResponseError(res));
                }

                debug('session-tokens', body);
                self.tokens['App-Token'] = body.token;

                return resolve(body);
            });
        });
    };

    /**
     * Connect as a web socket client using the highest authentication token
     * currently available.
     *
     * After calling this, attach event listeners such as
     * `respoke.on('connect')` and `respoke.on('error')`.
     *
     * @param {object} opts optional
     * @param {string} opts.endpointId required if not connecting using App-Token
     * @param {string} opts['Admin-Token'] optional
     * @param {string} opts['App-Secret'] optional
     * @param {string} opts['App-Token'] optional
     * @param {object} opts.connectParams optional Socket.io connection parameters
     */
    self.auth.connect = function (opts) {
        opts = _.defaults(opts || {}, {
            'Admin-Token': self.tokens['Admin-Token'],
            'App-Secret': self.tokens['App-Secret'],
            'App-Token': self.tokens['App-Token'],
            endpointId: self.endpointId,
            connectParams: self.socketIOConnectParams || {
                'force new connection': true,
                'max reconnection attempts': Infinity
            }
        });

        debug('auth connect', opts);

        if (!opts['Admin-Token'] && !opts['App-Secret'] && !opts['App-Token']) {
            return self.emit('error', new errors.NoAuthenticationTokens());
        }

        var adminAuth = opts['Admin-Token'] || opts['App-Secret'];
        if (adminAuth && !opts.endpointId) {
            return self.emit('error', new errors.MissingEndpointIdAsAdmin());
        }

        var tokenQuery = _.assign({}, sdkHeader);
        if (opts['App-Token']) {
            tokenQuery['app-token'] = opts['App-Token'];
        }
        else if (opts['App-Secret']) {
            tokenQuery['app-secret'] = opts['App-Secret'];
        }
        else if (opts['Admin-Token']) {
            tokenQuery['admin-token'] = opts['Admin-Token'];
        }

        // save socket.io connect params for reconnect and re-respoke auth, if autoreconnect enabled
        if (self.autoreconnect && !self.socketIOConnectParams) {
            self.socketIOConnectParams = opts.connectParams;
        }

        var dataBody = {};

        if (opts.endpointId) {
            dataBody.endpointId = opts.endpointId;
            if (!self.endpointId) {
                self.endpointId = opts.endpointId; // save endpointId
            }
        }

        if (opts.clientType) {
            dataBody.clientType = opts.clientType;
        }

        // Remove the path and set the query to build the Socket.io URL
        var parsedURL = url.parse(self.baseURL);
        parsedURL.pathname = '';
        parsedURL.query = tokenQuery;
        var connectionString = url.format(parsedURL);

        debug('web socket connecting', connectionString, opts.connectParams);
        if (self.socket) {
            self.socket.disconnect();
        }
        self.socket = io.connect(connectionString, opts.connectParams);

        // Assign all listeners on the next tick so there is a chance to
        // write test spies on the socket after calling `connect()`
        process.nextTick(function () {
            // TODO: create tests for these event listeners, especially the ones
            // with logic
            self.socket.on('connect', function () {
                debug('event connect', self.endpointId);
                self.wsCall('post', '/connections', dataBody)
                    .then(function (data) {
                        self.endpointId = data.endpointId;
                        self.connectionId = data.id;
                        /**
                         * Connected to respoke.
                         * @event connect
                         */
                        self.emit('connect');
                    }, function (error) {
                        self.emit('error', error);
                    }).catch(function (error) {
                        process.nextTick(function () { throw error; });
                    });
            });
            self.socket.on('disconnect', function () {
                debug('event disconnect', self.endpointId);
                /**
                 * Disconnected from respoke.
                 * @event disconnect
                 */
                self.emit('disconnect');

                self.clearAutoreconnectTimeout();

                if (!self.autoreconnect) {
                    return;
                }
                if (!self.tokens['App-Secret']) {
                    self.emit('error', new errors.MissingAppSecretDuringAutoreconnect());
                    return;
                }
                self.autoreconnectTimeout = setTimeout(function () {
                    self._attemptAutoreconnect();
                }, self.autoreconnectInterval);
            });
            self.socket.on('reconnect', function (num) {
                debug('event reconnect', self.endpointId, num);
                /**
                 * Reconnected with respoke.
                 * @event reconnect
                 * @property {number} num
                 */
                self.emit('reconnect', num);
                self.clearAutoreconnectTimeout();
            });
            self.socket.on('reconnecting', function (num) {
                debug('event reconnecting', self.endpointId, num);
                /**
                 * Reconnecting with respoke.
                 * @event reconnecting
                 * @property {number} num
                 */
                self.emit('reconnecting', num);
            });
            self.socket.on('error', function (err) {
                debug('event error', self.endpointId, err);
                /**
                 * An error occurred.
                 * @event error
                 * @property {error} err
                 */
                self.emit('error', err);
            });
            self.socket.on('connect_failed', function () {
                debug('event connect_failed', self.endpointId);
                // connect_failed is only emitted when there's a timeout, or when
                // the protocols are misconfigured. Other connection failures come
                // as error events. emit an error event for a consistent API.
                self.emit('error', new Error('Socket.io connect failed'));
            });
            self.socket.on('message', function (msg) {
                debug('event message', self.endpointId, msg);
                /**
                 * There is an incoming private message, from an endpoint.
                 * @event message
                 * @property {object} msg
                 */
                self.emit('message', msg);
            });
            self.socket.on('presence', function (res) {
                debug('event presence', self.endpointId, res);
                /**
                 * Presence for an endpoint has changed or is now available.
                 * @event presence
                 * @property {object} res
                 */
                self.emit('presence', res);
            });
            self.socket.on('join', function (res) {
                debug('event join', self.endpointId, res);
                res.header.groupId = res.header.channel;
                delete res.header.channel;
                /**
                 * An endpoint (which can include this client) has joined a group.
                 * @event join
                 * @property {object} res
                 */
                self.emit('join', res);
            });
            self.socket.on('leave', function (res) {
                debug('event leave', self.endpointId, res);
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
                debug('event pubsub', self.endpointId, res);
                res.header.groupId = res.header.channel;
                delete res.header.channel;
                /**
                 * A group message has been received.
                 * @event pubsub
                 * @property object res
                 */
                self.emit('pubsub', res);
            });
        });
    };

    /**
     * Authenticate with full admin privileges. This is not a recommended auth strategy
     * and should only be used in rare circustances when `App-Secret` auth is not
     * enough.
     *
     * Upon successful authentication, it sets the property `respoke.tokens['Admin-Token']`
     * which will be used during HTTP requests or to establish a web socket.
     * `{ token: 'XXXX-XXX-XXXXX-XX' }`
     *
     * @param {object} opts - Required
     * @param {string} opts.username
     * @param {string} opts.password
     * @param {function} callback (err, body)
     */
    self.auth.admin = function (opts, callback) {

        if (callback) {
            nodeify(self.auth.admin(opts), callback);
            return;
        }

        return new Promise(function (resolve, reject) {
            if (!opts.username) {
                return reject(new Error("Cannot authenticate without username"));
            }
            if (!opts.password) {
                return reject(new Error("Cannot authenticate without password"));
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

            self.request(authParams, function (err, res, body) {
                if (err) {
                    return reject(err);
                }

                if (!isOk(res.statusCode)) {
                    return reject(new errors.UnexpectedServerResponseError(res));
                }

                debug('admin session token', body);
                self.tokens['Admin-Token'] = body.token;

                return resolve(body);
            });
        });
    };

    /**
     * Delete the app auth session, disconnect the web socket, and remove all listeners.
     * @param {function} callback (err)
     */
    self.close = function (callback) {
        self.autoreconnect = false;

        if (callback) {
            nodeify(self.close(), callback);
            return;
        }
        return new Promise(function (resolve, reject) {
            if (self.socket) {
                self.socket.disconnect();
            }
            resolve();
        });
    };

    /**
     * Namespace object. Methods for interacting with presence indication.
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
        if (callback) {
            nodeify(self.presence.observe(endpoints), callback);
            return;
        }
        if (typeof endpoints === 'string') {
            endpoints = [endpoints];
        }
        return self.wsCall('post', '/presence-observers', {
            endpointList: endpoints
        });
    };
    /**
     * Set your own presence.
     *
     * @param {object} params
     * @param {string|number|object|array} params.presence - Your presence object. Format varies,
     * depending on how your application decides to implement presence.
     * @param {string} params.status - Human readable status message.
     * @param {function} callback
     */
    self.presence.set = function (params, callback) {
        if (callback) {
            nodeify(self.presence.set(params), callback);
            return;
        }

        var body = {
            presence: {
                show: params.show || true,
                status: params.status,
                type: params.presence || "available"
            }
        };

        return self.wsCall('post', '/presence', body);
    };

    /**
     * Namespace object. Messaging.
     * @type {object}
     */
    self.messages = { };

    /**
     * Send a message to an endpoint or specific connection of an endpoint.
     *
     * @param {object} params
     * @param {string} params.to endpointId
     * @param {string} params.connectionId optional
     * @param {string} params.message required
     * @param {string} params.type='message' optional
     * @param {string} params.ccSelf=true optional
     * @param {string} params.endpointId optional
     * @param {function} callback
     */
    self.messages.send = function (params, callback) {
        if (callback) {
            nodeify(self.messages.send(params), callback);
            return;
        }
        params = _.defaults(params || {}, {
            type: 'message',
            ccSelf: true
        });

        // send message over websocket when it is connected
        if (self.socket) {
            return self.wsCall('post', '/messages', params);
        }

        // send message over HTTP when not connected via websocket
        var requestParams = {
            uri: self.baseURL + '/messages',
            method: 'POST',
            headers: self.tokens,
            json: true,
            body: params
        };

        return new Promise(function (resolve, reject) {
            self.request(requestParams, function (err, res, body) {
                if (err) {
                    return reject(err);
                }

                if (!isOk(res.statusCode)) {
                    return reject(new errors.UnexpectedServerResponseError(res));
                }

                return resolve(body);
            });
        });
    };

    /**
     * Namespace object. Groups.
     * @type {object}
     */
    self.groups = { };

    /**
     * Send a message to a group. When authenticated as an admin via `App-Secret`
     * or `Admin-Token`, you can pass messages for any `endpointId`.
     *
     * @param {object} params
     * @param {string} params.groupId
     * @param {string} params.message
     * @param {string} params.endpointId=self.endpointId
     * @param {function} callback
     */
    self.groups.publish = function (params, callback) {
        if (callback) {
            nodeify(self.groups.publish(params), callback);
            return;
        }

        if (!params.groupId) {
            return Promise.reject(
                new Error("Cannot send group message without groupId")
            );
        }

        return self.wsCall(
            'post',
            '/channels/' + encodeURIComponent(params.groupId) + '/publish',
            {
                endpointId: params.endpointId || self.endpointId,
                message: params.message
            }
        );
    };

    /**
     * Get the members of a group.
     *
     * @param {object} params
     * @param {string} params.groupId
     * @param {function} callback
     */
    self.groups.getSubscribers = function (params, callback) {
        if (callback) {
            nodeify(self.groups.getSubscribers(params), callback);
            return;
        }

        if (!params.groupId) {
            return Promise.reject(
                new Error("Cannot get group members without groupId")
            );
        }

        return self.wsCall(
            'get',
            '/channels/' + encodeURIComponent(params.groupId) + '/subscribers',
            null
        );
    };
    /**
     * Join a group.
     * @param {object} params
     * @param {string} params.groupId
     * @param {function} callback
     */
    self.groups.join = function (params, callback) {
        if (callback) {
            nodeify(self.groups.join(params), callback);
            return;
        }

        var body = {
            endpointId: self.endpointId
        };

        if (!params.groupId) {
            return Promise.reject(
                new Error("Cannot join group without groupId")
            );
        }

        if (params.connectionId) {
            body.connectionId = params.connectionId;
        }

        return self.wsCall(
            'post',
            '/channels/' + encodeURIComponent(params.groupId) + '/subscribers',
            body
        );
    };
    /**
     * Leave a group.
     * @param {object} params
     * @param {string} params.groupId
     * @param {string} params.endpointId optional
     * @param {function} callback
     */
    self.groups.leave = function (params, callback) {
        if (callback) {
            nodeify(self.groups.leave(params), callback);
            return;
        }

        if (!params.groupId) {
            return Promise.reject(
                new Error("Cannot leave group without groupId")
            );
        }

        var body = {
            endpointId: self.endpointId
        };
        return self.wsCall(
            'delete',
            '/channels/' + encodeURIComponent(params.groupId) + '/subscribers',
            body
        );
    };

    /**
     * Namespace object. For full admin only.
     * @type {object}
     */
    self.apps = { };

    /**
     * Get an app by `opts.appId`, or get all apps when `opts.appId` is not supplied.
     *
     *
     * @param {object} opts optional
     * @param {string} [opts.appId] optional
     * @param {object} [opts.headers] optional
     * @param {function} callback (err, app)
     */
    self.apps.get = function (opts, callback) {
        if (opts instanceof Function && !callback) {
            callback = opts;
            opts = {};
        }
        opts = opts || {};

        if (callback) {
            nodeify(self.apps.get(opts), callback);
            return;
        }

        return new Promise(function (resolve, reject) {
            var requestOptions = _.defaults(opts || {}, {
                uri: self.baseURL + '/apps' + (opts.appId ? '/' + opts.appId : ''),
                method: 'GET',
                headers: self.tokens
            });

            self.request(requestOptions, function (err, res, body) {
                if (err) {
                    return reject(err);
                }

                if (!isOk(res.statusCode)) {
                    return reject(new errors.UnexpectedServerResponseError(res));
                }

                return resolve(body);
            });
        });
    };

    /**
     * Namespace object. For full admin only.
     * @type {object}
     */
    self.roles = { };

    /**
     * Retrieve a security role
     *
     * @param {object} options required
     * @param {string} [options.appId] required
     * @param {string} [options.roleId] optional
     * @param {function} callback(err, role)
     */
    self.roles.get = function (opts, callback) {
        if (opts instanceof Function && !callback) {
            callback = opts;
            opts = {};
        }
        opts = opts || {};

        if (callback) {
            nodeify(self.roles.get(opts), callback);
            return;
        }

        return new Promise(function (resolve, reject) {
            if (!opts.appId) {
                return reject(new Error('appId is required to retrieve roles'));
            }

            var requestOptions = _.defaults(opts || {}, {
                uri: self.baseURL + '/roles' + (opts.roleId ? '/' + opts.roleId : '') + '?appId=' + opts.appId,
                method: 'GET',
                headers: opts.headers
            });

            self.request(requestOptions, function (err, res, body) {
                if (err) {
                    return reject(err);
                }

                if (!isOk(res.statusCode)) {
                    return reject(new errors.UnexpectedServerResponseError(res));
                }

                return resolve(body);
            });
        });
    };

    /**
     * Create a security role.
     *
     * The callback data object contains the `id` of the created role,
     * which can be used for authenticating endpoints.
     *
     * @param {object} role the role to create required
     * @param {string} [role.appId] required
     * @param {string} [role.name] required
     * @param {object} opts optional request opts
     * @param {object} [opts.headers] optional
     * @param {function} callback(err, createdRole)
     */
    self.roles.create = function (role, opts, callback) {
        role = role || {};
        opts = opts || {};
        if (opts instanceof Function && !callback) {
            callback = opts;
            opts = {};
        }

        if (callback) {
            nodeify(self.roles.create(role, opts), callback);
            return;
        }

        return new Promise(function (resolve, reject) {
            if (!role.appId) {
                return reject(new Error("Cannot create role when appId is " + role.appId));
            }
            if (!role.name) {
                return reject(new Error("Cannot create role when name is " + role.name));
            }

            var requestOptions = _.defaults(opts || {}, {
                uri: self.baseURL + '/roles',
                method: 'POST',
                headers: opts.headers,
                body: role
            });
            self.request(requestOptions, function (err, res, body) {
                if (err) {
                    return reject(err);
                }

                if (!isOk(res.statusCode)) {
                    return reject(new errors.UnexpectedServerResponseError(res));
                }

                return resolve(body);
            });
        });
    };

    /**
     * Remove a security role.
     *
     * @param {object} opts required
     * @param {string} [opts.roleId] required
     * @param {object} [opts.headers] optional
     * @param {function} callback(err)
     */
    self.roles.delete = function (opts, callback) {
        opts = opts || {};

        if (callback) {
            nodeify(self.roles.delete(opts), callback);
            return;
        }

        return new Promise(function (resolve, reject) {
            if (!opts.roleId) {
                return reject(new Error("Cannot delete role when roleId is " + opts.roleId));
            }

            var requestOptions = ({
                uri: self.baseURL + '/roles/' + opts.roleId,
                method: 'DELETE',
                headers: opts.headers
            });

            self.request(requestOptions, function (err, res, body) {
                if (err) {
                    return reject(err);
                }

                if (!isOk(res.statusCode)) {
                    return reject(new errors.UnexpectedServerResponseError(res));
                }

                return resolve(body);
            });
        });
    };

    return self;
}
util.inherits(Client, events.EventEmitter);
exports = module.exports = Client;
