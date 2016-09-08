# rabbitmq-rpc-eventemitter-mock

Mock for [rabbitmq-rpc-eventemitter](https://www.npmjs.com/package/rabbitmq-rpc-eventemitter). Used together with [rabbitmq-eventemitter-mock](https://www.npmjs.com/package/rabbitmq-eventemitter-mock).

	npm install rabbitmq-rpc-eventemitter-mock

# Usage

The module supports the same interface as `rabbitmq-rpc-eventemitter`. It has an additional `connection` property associated with each queue instance, which represents the remote subscriber or publisher.

```javascript
var queue = require('rabbitmq-eventemitter-mock')();
var rpc = require('rabbitmq-rpc-eventemitter-mock')(queue);

rpc.pull('get.instance', function(message, callback) {
	console.log(message); // prints { request: 1 }
	callback(null, { response: 1 });
});

rpc.connection.push('get.instance', { request: 1 }, function(err, message) {
	console.log(message); // prints { response: 1 }
});
```

The module can be used together with [mockery](https://github.com/mfncooper/mockery).

```javascript
var mockery = require('mockery');

mockery.registerSubstitute('rabbitmq-rpc-eventemitter', 'rabbitmq-rpc-eventemitter-mock');
mockery.enable();
```
