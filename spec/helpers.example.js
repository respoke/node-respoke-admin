/*
 * Copyright 2014, Digium, Inc.
 * All rights reserved.
 *
 * This source code is licensed under The MIT License found in the
 * LICENSE file in the root directory of this source tree.
 *
 * For all details and documentation:  https://www.respoke.io
 */
'use strict';

// Put your own values in here and rename this to `helpers.js`
exports = module.exports = {
    baseURL: "https://api.respoke.io/v1",
    auth: {
        username: "",
        password: ""
    },
    appId: "",
    appSecret: "",
    roleId: "",
    role: function () {
        return {
            "appId": "",
            "name":"",

            // do not edit below here
            "mediaRelay": false,
            "events": {
                "subscribe": false,
                "unsubscribe": false,
            },
            "groups": {
                "list": true,
                "*": {
                    "subscribe": true,
                    "unsubscribe": true,
                    "create": true,
                    "destroy": true,
                    "publish": true,
                    "getsubscribers": true
                }
            }
        };
    }
};
