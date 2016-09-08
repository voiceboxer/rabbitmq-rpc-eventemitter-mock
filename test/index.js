var util = require('util');
var test = require('tape');
var rabbitmq = require('rabbitmq-eventemitter-mock');
var deepEqual = require('deep-equal');

var rpc = require('../');

var expectsOnce = function() {
  var args = arguments;
  var seen = {};

  return function(obj) {
    for(var i = 0; i < args.length; i++) {
      if(deepEqual(args[i], obj) && !seen[i]) {
        seen[i] = true;
        return true;
      }
    }

    return false;
  };
};

var createQueue = function() {
  var queue = rabbitmq();
  return rpc(queue);
};

test('queue push', function(t) {
  var queue = createQueue();

  t.plan(3);

  queue.connection.pull('test-pattern', function(message, callback) {
    t.deepEquals(message, { ok: 1 });
    callback(null, { ok: 2 });
  });

  queue.push('test-pattern', { ok: 1 }, function(err, message) {
    t.error(err);
    t.deepEquals(message, { ok: 2 });
  });
});

test('queue multiple push', function(t) {
  var queue = createQueue();

  t.plan(6);

  var valid = expectsOnce({ ok: 1 }, { ok: 2 });

  queue.connection.pull('test-pattern', function(message, callback) {
    t.ok(valid(message), 'request message ' + util.inspect(message));
    callback(null, { ok: message.ok + 2 });
  });

  queue.push('test-pattern', { ok: 1 }, function(err, message) {
    t.error(err);
    t.deepEqual(message, { ok: 3 });
  });

  queue.push('test-pattern', { ok: 2 }, function(err, message) {
    t.error(err);
    t.deepEquals(message, { ok: 4 });
  });
});

test('async queue push', function(t) {
  var queue = createQueue();

  t.plan(3);

  queue.connection.pull('test-pattern', function(message, callback) {
    t.deepEquals(message, { ok: 1 });
    callback(null, { ok: 2 });
  });

  setImmediate(function() {
    queue.push('test-pattern', { ok: 1 }, function(err, message) {
      t.error(err);
      t.deepEquals(message, { ok: 2 });
    });
  });
});

test('queue push without data', function(t) {
  var queue = createQueue();

  t.plan(3);

  queue.connection.pull('test-pattern', function(message, callback) {
    t.deepEquals(message, {});
    callback(null, { ok: 1 });
  });

  queue.push('test-pattern', function(err, message) {
    t.error(err);
    t.deepEquals(message, { ok: 1 });
  });
});

test('queue push with error', function(t) {
  var queue = createQueue();

  t.plan(5);

  queue.connection.pull('test-pattern', function(message, callback) {
    t.deepEquals(message, { ok: 1 });
    callback(new TypeError('test-message'));
  });

  queue.push('test-pattern', { ok: 1 }, function(err, message) {
    t.ok(err instanceof Error);
    t.equals(err.message, 'test-message');
    t.equals(err.name, 'TypeError');
    t.ok(err.stack);
  });
});

test('queue push additional options', function(t) {
  var queue = createQueue();

  t.plan(4);

  queue.connection.pull('test-pattern', function(message, options, callback) {
    t.deepEquals(message, { ok: 1 });
    t.equals(options.correlationId, 'test-correlation-id');
    callback(null, { ok: 2 });
  });

  queue.push('test-pattern', { ok: 1 }, { correlationId: 'test-correlation-id' }, function(err, message) {
    t.error(err);
    t.deepEquals(message, { ok: 2 });
  });
});

test('queue pull', function(t) {
  var queue = createQueue();

  t.plan(3);

  queue.pull('test-pattern', function(message, callback) {
    t.deepEquals(message, { ok: 1 });
    callback(null, { ok: 2 });
  });

  queue.connection.push('test-pattern', { ok: 1 }, function(err, message) {
    t.error(err);
    t.deepEquals(message, { ok: 2 });
  });
});

test('queue multiple pull', function(t) {
  var queue = createQueue();

  t.plan(6);

  var valid = expectsOnce({ ok: 1 }, { ok: 2 });

  queue.pull('test-pattern', function(message, callback) {
    t.ok(valid(message), 'request message ' + util.inspect(message));
    callback(null, { ok: message.ok + 2 });
  });

  queue.connection.push('test-pattern', { ok: 1 }, function(err, message) {
    t.error(err);
    t.deepEqual(message, { ok: 3 });
  });

  queue.connection.push('test-pattern', { ok: 2 }, function(err, message) {
    t.error(err);
    t.deepEquals(message, { ok: 4 });
  });
});

test('async queue pull', function(t) {
  var queue = createQueue();

  t.plan(3);

  queue.pull('test-pattern', function(message, callback) {
    t.deepEquals(message, { ok: 1 });

    setImmediate(function() {
      callback(null, { ok: 2 });
    });
  });

  queue.connection.push('test-pattern', { ok: 1 }, function(err, message) {
    t.error(err);
    t.deepEquals(message, { ok: 2 });
  });
});

test('queue pull without data', function(t) {
  var queue = createQueue();

  t.plan(3);

  queue.pull('test-pattern', function(message, callback) {
    t.deepEquals(message, {});
    callback(null, { ok: 1 });
  });

  queue.connection.push('test-pattern', function(err, message) {
    t.error(err);
    t.deepEquals(message, { ok: 1 });
  });
});

test('queue pull with error', function(t) {
  var queue = createQueue();

  t.plan(5);

  queue.pull('test-pattern', function(message, callback) {
    t.deepEquals(message, { ok: 1 });
    callback(new TypeError('test-message'));
  });

  queue.connection.push('test-pattern', { ok: 1 }, function(err, message) {
    t.ok(err instanceof Error);
    t.equals(err.message, 'test-message');
    t.equals(err.name, 'TypeError');
    t.ok(err.stack);
  });
});

test('queue pull additional options', function(t) {
  var queue = createQueue();

  t.plan(4);

  queue.pull('test-pattern', function(message, options, callback) {
    t.deepEquals(message, { ok: 1 });
    t.equals(options.correlationId, 'test-correlation-id');
    callback(null, { ok: 2 });
  });

  queue.connection.push('test-pattern', { ok: 1 }, { correlationId: 'test-correlation-id' }, function(err, message) {
    t.error(err);
    t.deepEquals(message, { ok: 2 });
  });
});

test('queue connection pull once', function(t) {
  var queue = createQueue();

  t.plan(3);

  queue.connection.pullOnce('test-pattern', function(message, callback) {
    t.deepEquals(message, { ok: 1 });
    callback(null, { ok: 3 });
  });

  queue.push('test-pattern', { ok: 1 }, function(err, message) {
    t.error(err);
    t.deepEquals(message, { ok: 3 });

    queue.push('test-pattern', { ok: 2 }, function(err, message) {
      t.fail();
    });
  });
});
