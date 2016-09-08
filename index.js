var events = require('events');
var util = require('util');

var noop = function() {};

var random = function() {
  return Date.now() + '.' + Math.random();
};

var serializeError = function(obj) {
  if(util.isError(obj)) {
    return {
      __error__: true,
      message: obj.message,
      name: obj.name,
      stack: obj.stack
    };
  }
};

var parseError = function(obj) {
  if(obj.__error__) {
    var err = new Error(obj.message);
    err.name = obj.name;
    err.stack = obj.stack;
    return err;
  }
};

var Queue = function(queue) {
  this._queue = queue;
  this._requests = {};
  this._listener = null;

  var self = this;

  queue.pull('__callback', function(message, options, callback) {
    var err = parseError(message);
    self._resolve(options.correlationId, err, message);
  });
};

Queue.prototype.push = function(pattern, data, options, callback) {
  if(!callback && typeof options === 'function') {
    callback = options;
    options = null;
  }
  if(!callback && typeof data === 'function') {
    callback = data;
    data = null;
  }

  data = data || {};
  options = options || {};
  callback = callback || noop;

  var self = this;
  var correlationId = options.correlationId || random();

  options.replyTo = options.replyTo || '__callback';
  options.correlationId = options.correlationId || correlationId;

  this._requests[correlationId] = callback;
  this._queue.push(pattern, data, options, function(err) {
    if(err) self._resolve(correlationId, err);
  });
};

Queue.prototype.pull = function(pattern, listener, callback) {
  var self = this;

  this._queue.pull(pattern, this._listener = function(message, options, cb) {
    if(!options.replyTo || !options.correlationId) return;

    var onresponse = function(err, data) {
      data = serializeError(err) || data;

      self._queue.push(options.replyTo, data, {
        correlationId: options.correlationId
      }, cb);
    };

    if(listener.length <= 2) listener(message, onresponse);
    else listener(message, options, onresponse);
  }, callback);
};

Queue.prototype._resolve = function(correlationId, err, data) {
  var cb = this._requests[correlationId];

  if(cb) {
    delete this._requests[correlationId];

    if(err) cb(err);
    else cb(null, data);
  }
};

var QueueEventEmitter = function(queue) {
  events.EventEmitter.call(this);
  Queue.call(this, queue);
};

util.inherits(QueueEventEmitter, events.EventEmitter);
Object.assign(QueueEventEmitter.prototype, Queue.prototype);

module.exports = function(queue) {
  var rpc = new QueueEventEmitter(queue);
  var connection = new Queue(queue.connection);

  connection.pull = function(pattern, listener) {
    Queue.prototype.pull.call(this, pattern, listener);

    var targets = listener.__targets || [];
    targets.push({ pattern: pattern, listener: this._listener });
    listener.__targets = targets;
  };

  connection.pullOnce = function(pattern, listener) {
    var self = this;
    var fn = listener.length <= 2 ?
      function(message, cb) {
        self.removeListener(pattern, fn);
        listener.call(this, message, cb);
      } : function(message, options, cb) {
        self.removeListener(pattern, fn);
        listener.call(this, message, options, cb);
      };

    this.pull(pattern, fn);
  };

  connection.removeListener = function(pattern, listener) {
    var targets = listener.__targets || [];

    for(var i = 0; i < targets.length; i++) {
      var target = targets[i];

      if(target.pattern === pattern) {
        queue.connection.removeListener(pattern, target.listener);

        targets.splice(i, 1);
        if(!targets.length) delete listener.__targets;
        return;
      }
    }
  };

  rpc.connection = connection;

  rpc.close = function(callback) {
    queue.close(callback);
  };

  return rpc;
};
