

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





exports = module.exports = Admin;
