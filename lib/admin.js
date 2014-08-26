var request = require('request');

/**
 * Access to the Respoke admin Rest API.
 * 
 * Using `options.appSecret` to authenticate is recommended for security purposes. It will only allow 
 * using the `admin.authenticateEndpoint()` method.
 * 
 * @param {object} options
 * @param {string} options.appSecret required unless using `options.username` and `options.password`
 * @param {string} options.username required unless using `options.appSecret`
 * @param {string} options.password required unless using `options.appSecret`
 * @param {string} options.baseURL=https://api.respoke.io optional
 * @param {boolean} options.dontAuthenticate=false optional
 * @param {function} cb(err, authenticationObject) will never be executed if passing `options.dontAuthenticate=true`
 */
function Admin(options, cb) {
    cb = cb || function () {};

    var self = this;
    self.adminToken = null;
    self.baseURL = options.baseURL || "https://api.respoke.io/v1";
    self.appSecret = options.appSecret || null;

    self.send = function (params, callback) {
        callback = callback || function () {};

        request(params, function (err, res, body) {
            if (err) {
                return callback(err, body || res);
            }
            if (!err && res.statusCode !== 200) {
                err = new Error(body.error);
                return callback(err, body || res);
            }
            callback(null, body);
        });
    };

    var authParams = {
        uri: self.baseURL + '/adminsessions',
        method: 'POST',
        json: true,
        body: {
            username: options.username,
            password: options.password
        }
    };

    /**
     * Sets this.adminToken
     */
    self.authenticate = function (callback) {
        this.send(authParams, function(err, body) {
            if (err) {
                return callback(err, body);
            }

            self.adminToken = body.token;
            callback(null, body);
        });
    };

    if (!options.dontAuthenticate && !options.appSecret) {
        self.authenticate(cb);
    }
    else if (cb) {
        cb(null);
    }

    return this;
}

/**
 * Get an app.
 * 
 * Provide an `appId` and get the app details in return.
 * @param {string} [options.appId]
 * @param {function} callback
 */
Admin.prototype.getApp = function (options, callback) {
    if (!options.appId) {
        return callback(new Error("Cannot get app when appId is " + options.appId));
    }
    var requestOptions = {
        uri: this.baseURL + '/apps/' + options.appId,
        method: 'GET',
        headers: {
            'Admin-Token': this.adminToken
        },
        json: true
    };
    this.send(requestOptions, callback);
};

/**
 * List all apps.
 * 
 * @param {function} callback
 */
Admin.prototype.getAllApps = function (callback) {
    var requestOptions = {
        uri: this.baseURL + '/apps',
        method: 'GET',
        headers: {
            'Admin-Token': this.adminToken
        },
        json: true
    };
    this.send(requestOptions, callback);
};

/**
 * Create a security role.
 * 
 * The callback data object contains the `id` of the created role, which is needed for authenticating endpoints.
 * @param {object} role
 * @param {object} [options.appId] required
 * @param {function} callback(err, createdRole)
 */
Admin.prototype.createRole = function (role, callback) {
    role = role || {};

    if (!role.appId) {
        return callback(new Error("Cannot create role when appId is " + role.appId));
    }
    if (!role.name) {
        return callback(new Error("Cannot create role when name is " + role.name));
    }
    
    var requestOptions = {
        uri: this.baseURL + '/roles',
        method: 'POST',
        headers: {
            'Admin-Token': this.adminToken
        },
        json: true,
        body: role
    };
    this.send(requestOptions, callback);
};

/**
 * Remove a security role.
 * 
 * The callback data object contains the `id` of the created role, which is needed for authenticating endpoints.
 * @param {string} roleId required
 * @param {function} callback(err)
 * @private
 */
Admin.prototype.removeRole = function (roleId, callback) {
    
    if (!roleId) {
        return callback(new Error("Cannot delete role when roleId is " + roleId));
    }
    
    var requestOptions = {
        uri: this.baseURL + '/roles/' + roleId,
        method: 'DELETE',
        headers: {
            'Admin-Token': this.adminToken
        },
        json: true
    };
    this.send(requestOptions, callback);
};


/**
 * Authenticate an endpoint.
 *
 * Authenticate an endpoint for a specific appId and receive an auth `token` for that user.
 * 
 * @param {object} options
 * @param {object} options.appId required
 * @param {object} options.endpointId required
 * @param {object} options.roleId required unless app is in development mode
 * @param {object} options.ttl=86400 optional seconds time-to-live
 * @param {object} options.appSecret optional overrides `client.appSecret` 
 * @param {function} callback(err, clientAuthData)
 */
Admin.prototype.authenticateEndpoint = function (options, callback) {
    options = options || {};
    var self = this;

    if (!options.appId) {
        return callback(new Error("Cannot authenticate endpoint when appId is " + options.appId));
    }
    if (!options.endpointId) {
        return callback(new Error("Cannot authenticate endpoint when endpointId is " + options.endpointId));
    }


    var doAuth = function (secret) {
        var requestOptions = {
            uri: self.baseURL + '/tokens',
            method: 'POST',
            headers: {
                'App-Secret': secret
            },
            json: true,
            body: {
                appId: options.appId,
                endpointId: options.endpointId,
                ttl: options.ttl || 86400,
                roleId: options.roleId
            }
        };
        self.send(requestOptions, callback);
    };

    if (self.appSecret || options.appSecret) {
        doAuth(self.appSecret || options.appSecret);
        return;
    }

    self.getApp(options, function (err, app) {
        if (err) {
            return callback(err, app);
        }

        doAuth(app.secret);
    });



};


exports = module.exports = Admin;
