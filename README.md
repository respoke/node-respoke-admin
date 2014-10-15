
[![NPM Version](https://badge.fury.io/js/respoke.svg)](https://badge.fury.io/js/respoke)
[![Build Status](https://travis-ci.org/respoke/node-respoke.svg)](https://travis-ci.org/respoke/node-respoke)
[![Dependency Status](https://david-dm.org/respoke/node-respoke.svg)](https://david-dm.org/respoke/node-respoke)
[![devDependency Status](https://david-dm.org/respoke/node-respoke/dev-status.svg)](https://david-dm.org/respoke/node-respoke#info=devDependencies)

# node-respoke

This wraps the [Respoke][respoke] HTTP and WebSocket API's for use in a Node.js
app or server.

[respoke]: https://respoke.io "respoke.io"

## Usage

Install using npm.

    npm install --save respoke

For more details on the node-respoke API see the
[project documentation][node-respoke]. For more on the Respoke service and how
it works see the [full documentation][respoke-docs].

[node-respoke]: https://respoke.github.io/node-respoke "node-respoke documentation"
[respoke-docs]: https://docs.respoke.io "full respoke documentation"

## Testing

Before you can run the functional tests you will need to complete the following
steps.

- create a test app in the your admin portal at [respoke.io][respoke]
- turn *off* dev mode
- create a new blank role (name value is not important)
- `cp spec/helpers.example.js spec/helpers.js`
- fill in the information in the `spec/helpers.js` file

There are several commands to run the tests.

    # run all tests
    npm test

    # run all tests with extra debug output
    npm run debug-test

    # run only unit tests
    npm run unit

    # run only functional tests
    npm run functional

## License

This software is licensed under the [MIT license](http://opensource.org/licenses/MIT).

> Copyright (c) 2014 Digium, Inc.
>
> Permission is hereby granted, free of charge, to any person obtaining a copy
> of this software and associated documentation files (the "Software"), to
> deal in the Software without restriction, including without limitation the
> rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
> sell copies of the Software, and to permit persons to whom the Software is
> furnished to do so, subject to the following conditions:
>
> The above copyright notice and this permission notice shall be included in
> all copies or substantial portions of the Software.
>
> THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
> IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
> FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
> AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
> LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
> FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
> IN THE SOFTWARE.
