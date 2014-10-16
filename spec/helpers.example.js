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
