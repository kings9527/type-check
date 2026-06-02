var assert = require('assert');
var typeCheck = require('../lib/index');

var c = typeCheck.typeCheckDetailed;
var parseType = typeCheck.parseType;
var ptcDetailed = typeCheck.parsedTypeCheck.detailed;

suite('typeCheckDetailed', function() {

  test('basic type match returns true with no errors', function() {
    var result = c('Number', 2);
    assert.strictEqual(result.result, true);
    assert.deepStrictEqual(result.errors, []);
  });

  test('basic type mismatch returns false with error', function() {
    var result = c('Number', 'str');
    assert.strictEqual(result.result, false);
    assert(result.errors.length > 0);
    assert(result.errors[0].indexOf('Expected') !== -1);
    assert(result.errors[0].indexOf('String') !== -1);
  });

  test('wildcard returns true', function() {
    var result = c('*', 42);
    assert.strictEqual(result.result, true);
    assert.deepStrictEqual(result.errors, []);
  });

  test('nested object field error reports path', function() {
    var result = c('{x: Number, y: Boolean}', {x: 2, y: 'not-bool'});
    assert.strictEqual(result.result, false);
    assert(result.errors.length > 0);
    var hasYError = result.errors.some(function(e) {
      return e.indexOf('y') !== -1 && e.indexOf('Boolean') !== -1;
    });
    assert(hasYError, 'Expected error mentioning field y and Boolean, got: ' + JSON.stringify(result.errors));
  });

  test('array element error reports index path', function() {
    var result = c('[Number]', [1, 'str', 3]);
    assert.strictEqual(result.result, false);
    assert(result.errors.length > 0);
    var hasIndexError = result.errors.some(function(e) {
      return e.indexOf('[1]') !== -1;
    });
    assert(hasIndexError, 'Expected error mentioning index [1], got: ' + JSON.stringify(result.errors));
  });

  test('tuple length mismatch reports error', function() {
    var result = c('(String, Number)', ['str']);
    assert.strictEqual(result.result, false);
    assert(result.errors.length > 0);
  });

  test('tuple too many elements reports error', function() {
    var result = c('(String, Number)', ['str', 2, 5]);
    assert.strictEqual(result.result, false);
    var hasTooMany = result.errors.some(function(e) {
      return e.indexOf('too many') !== -1;
    });
    assert(hasTooMany, 'Expected "too many" error, got: ' + JSON.stringify(result.errors));
  });

  test('object extra keys reports error', function() {
    var result = c('{x: Number, y: Boolean}', {x: 2, y: false, z: 3});
    assert.strictEqual(result.result, false);
    var hasExtraKeys = result.errors.some(function(e) {
      return e.indexOf('extra keys') !== -1 && e.indexOf('z') !== -1;
    });
    assert(hasExtraKeys, 'Expected "extra keys" error mentioning z, got: ' + JSON.stringify(result.errors));
  });

  test('object with subset allows extra keys', function() {
    var result = c('{x: Number, y: Boolean, ...}', {x: 2, y: false, z: 3});
    assert.strictEqual(result.result, true);
    assert.deepStrictEqual(result.errors, []);
  });

  test('custom type validation failure reports error', function() {
    var options = {
      customTypes: {
        Even: {
          typeOf: 'Number',
          validate: function(x) { return x % 2 === 0; }
        }
      }
    };
    var result = c('Even', 3, options);
    assert.strictEqual(result.result, false);
    var hasValidationError = result.errors.some(function(e) {
      return e.indexOf('failed validation') !== -1;
    });
    assert(hasValidationError, 'Expected validation failure error, got: ' + JSON.stringify(result.errors));
  });

  test('custom type typeOf mismatch reports error', function() {
    var options = {
      customTypes: {
        Even: {
          typeOf: 'Number',
          validate: function(x) { return x % 2 === 0; }
        }
      }
    };
    var result = c('Even', 'str', options);
    assert.strictEqual(result.result, false);
  });

  test('Maybe type with null passes', function() {
    var result = c('Maybe String', null);
    assert.strictEqual(result.result, true);
    assert.deepStrictEqual(result.errors, []);
  });

  test('Maybe type with undefined passes', function() {
    var result = c('Maybe String', undefined);
    assert.strictEqual(result.result, true);
    assert.deepStrictEqual(result.errors, []);
  });

  test('deeply nested error reports path', function() {
    var result = c('{a: {b: [Number]}}', {a: {b: [1, 'wrong', 3]}});
    assert.strictEqual(result.result, false);
    var hasPath = result.errors.some(function(e) {
      return e.indexOf('a.b[1]') !== -1 || e.indexOf('root.a.b') !== -1;
    });
    assert(hasPath, 'Expected error with nested path, got: ' + JSON.stringify(result.errors));
  });

  test('parsedTypeCheck.detailed basic', function() {
    var parsed = parseType('Number');
    var result = ptcDetailed(parsed, 42);
    assert.strictEqual(result.result, true);
    assert.deepStrictEqual(result.errors, []);
  });

  test('parsedTypeCheck.detailed mismatch', function() {
    var parsed = parseType('String');
    var result = ptcDetailed(parsed, 42);
    assert.strictEqual(result.result, false);
    assert(result.errors.length > 0);
  });

  test('typeCheckDetailed with union type - first matches', function() {
    var result = c('Number | String', 42);
    assert.strictEqual(result.result, true);
    assert.deepStrictEqual(result.errors, []);
  });

  test('typeCheckDetailed with union type - second matches', function() {
    var result = c('Number | String', 'hello');
    assert.strictEqual(result.result, true);
    assert.deepStrictEqual(result.errors, []);
  });

  test('typeCheckDetailed with union type - none matches', function() {
    var result = c('Number | String', true);
    assert.strictEqual(result.result, false);
    assert(result.errors.length >= 2, 'Expected errors from both type attempts, got: ' + result.errors.length);
  });

  test('duck typing with wrong type reports error', function() {
    var result = c('RegExp{source: String, ...}', {source: 're'});
    assert.strictEqual(result.result, false);
    var hasTypeError = result.errors.some(function(e) {
      return e.indexOf('RegExp') !== -1;
    });
    assert(hasTypeError, 'Expected RegExp type error, got: ' + JSON.stringify(result.errors));
  });

});
