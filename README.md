# Respoke for Node

https://www.respoke.io

# Contents

* [respoke.Admin](#admin-functionality)
* [respoke.Client](#client-functionality)
* [Testing and Dev](#testing-and-development)

# Links

* [Respoke Docs](https://docs.respoke.io)

# Admin functionality

### Authenticate as an admin for doing brokered auth only (recommended)

[Read about Respoke Brokered Auth](https://docs-int.respoke.io/articles/tutorials/brokered-auth.html)

    var Admin = require('respoke').Admin;
    var appSecret = "xxx-xxxxxx-xx-xxxxxx";

    var admin = new Admin({ appSecret: appSecret });

    // ready to do brokered auth for endpoints


### Authenticating as a full admin

    var Admin = require('respoke').Admin;
    var opts = {
        username: "dude",
        password: "wassup"
    };

    var admin = new Admin(opts, function (err, authInfo) {
        if (err) {
            console.error(err);
            return;
        }
        console.log(admin.adminToken, authInfo.token === admin.adminToken); // true
    });

#### Delay admin auth

    var admin = new Admin({
        username: "asdf",
        password: "jkl",
        dontAuthenticate: true
    });

    // stuff happens, then

    admin.authenticate(function (err, authInfo) {
        console.log("i am ready");
    });


### Authenticate a client endpoint

[Read about Respoke Brokered Auth](https://docs-int.respoke.io/articles/tutorials/brokered-auth.html)

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
    
### Authenticate as a client

    var Client = require('respoke').Client;
    var opts = {
        appId: "xxxxxx-xxx-xxxxxx-xxxx",
        endpointId: "adalovelace",
        developmentMode: true // optional dev mode flag for testing
    };

    var client = new Client(opts);

    client.on('connect', function () {
        console.log('we made it');
    });
    client.on('error', function (err) {
        console.error('Something broke', err);
    });

### Send a message to an endpoint

    client.sendMessage({
        endpointId: "asdf-jkl",
        message: "Hey Jude"
    }, function (err) {
        
    });

### Listen for private messages

    client.on('message', function (data) {
        console.log(data.header.type); // "message"
        console.log(data.header.from); // the endpointId who sent the message

        var message = data.body;
        console.log(message);
    });

### Send a message to a group

    client.sendGroupMessage({
        groupId: "beatles",
        message: "Hey Jude"
    }, function (err) {
        
    });

### Listen for group messages

    client.on('pubsub', function (data) {
        console.log(data.header.groupId);
    });

### Join a group

    client.join({ groupId: groupId }, function (err) {
        
    });

### Leave a group
    
    client.leave({ groupId: groupId }, function (err) {
        
    });

### Listen for people joining groups

    client.on('join', function (data) {
        console.log(data.header.groupId);
    });

### Listen for people leaving groups

    client.on('leave', function (data) {
        console.log(data.header.groupId);
    });

### Get all of the members of a group

    client.getGroupMembers({ groupId: groupId }, function (err, members) {
        console.log(members); // [{ endpointId: 'xxxxxx-xx-xx-xxxx', connectionId: 'xxxx-xxxx-xx-xxx' }]
    });

### Change your presence status

    client.setPresence({ status: "Out to lunch, figuratively" }, function (err) {
        if (err) {
            done(err);
        }
    });

### Listen for presence changes

    client.registerPresence(['timmay', 'cartman'], function (err) {
        if (err) {
            done(err);
        }
    });

### Other client socket events

    client.on('one of the events below', function (perhapsErrOrData) {

    });

 * `socket`
 * `connect`
 * `disconnect`
 * `reconnect`
 * `reconnecting`
 * `error`
 * `connect_error`
 * `connect_timeout`
 * `reconnecting`
 * `reconnect`

# Testing and development

Rename `spec/helpers.example.js` to `spec/helpers.js` and put in your credentials.

Testing requires mocha, then:

    npm test

### Debugging

    $  DEBUG=respoke-client,respoke-admin npm test
