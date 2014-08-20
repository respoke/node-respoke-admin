# Respoke for Node

https://www.respoke.io

# Usage

## Admin functionality

    var Admin = require('respoke').Admin;
    var opts = {
        // required
        username: "dude",
        password: "wassup"
    };

    // Authenticate the admin to get the `Admin-Token` header for the Respoke API
    var admin = new Admin(opts, function adminIsAuthenticated(err, authInfo) {

        console.log(authInfo.token === admin.adminToken); // true

        // this admin can now do stuff

    });

### Authenticate later

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

## Client functionality
    

*Coming soon*


# Test and development

Rename `spec/helpers.example.js` to `spec/helpers.js` and:

    npm test

