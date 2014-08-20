# Respoke for Node

https://www.respoke.io


# Admin functionality

### Authenticating as an admin

    var Admin = require('respoke').Admin;
    var opts = {
        username: "dude",
        password: "wassup"
    };

    var admin = new Admin(opts, function (err, authInfo) {

        console.log(admin.adminToken, authInfo.token === admin.adminToken); // true

        // this admin can now do stuff

    });

### Authenticate as an admin, but not immediately

    var admin = new Admin({
        username: "asdf",
        password: "jkl",
        dontAuthenticate: true
    });

    // stuff happens, then

    admin.authenticate(function (err, authInfo) {
        console.log("i am ready");
    });

### Authenticate an endpoint

[Respoke Brokered Auth](https://docs-int.respoke.io/articles/tutorials/brokered-auth.html)

    admin.authenticateEndpoint({
        appId: "xxxxx-xxxxx-xxxxxx",
        roleId: "xxxxxx-xxxxx-xxxxxx-xxxxxxx",
        endpointId: "your system identifier, username, etc for this client",
        ttl: 86400 // optional - defaults to this
    }, function (err, endpointAuthInfo) {

        console.log(endpointAuthInfo.tokenId);
        
        // now you can give the tokenId back to your client and they can use it 
        // to authenticate as an endpoint to Respoke 
    });


### Create a role

    var role = {
        "appId": "xxxx-xxx-xxxxx",
        "name":"my-special-friends",
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

    admin.createRole(role, function (err, createdRole) {
        console.log(createdRole);
    });

### Get an app

    admin.getApp({ appId: "xxxx-xxxxxx-xxx" }, function (err, app) {
        console.log(app);
    });

### Get all of your apps

    admin.getAllApps(function (err, arrayOfApps) {
        console.log(arrayOfApps);
    });


# Client functionality
    

*Coming soon*


# Testing and development

Rename `spec/helpers.example.js` to `spec/helpers.js` and put in your credentials.

Testing requires mocha, then:

    npm test

