/*
 * shapeOf
 * Unit Tests
 * 
 * The follows arguments can be used:
 * 
 *   verbose, v        Produces additional output during testing.
 *   squelch, s        Squelches the console.log() function.
 *   trace, t          Produces a stack trace on failing tests.
 */

let path = require('path');
let filename = path.basename(__filename);
let args = process.argv.map(a => a.toLowerCase());
let verbose = args.indexOf('verbose') >= 0 || args.indexOf('v') >= 0;
let squelch = args.indexOf('squelch') >= 0 || args.indexOf('s') >= 0;
let trace = args.indexOf('trace') >= 0 || args.indexOf('t') >= 0;
let originalConsoleLog = console.log;


// Override console's logging functions
let _console_log = (...args) => {
    // Bypass the 'squelch' commandline flag
    originalConsoleLog(...args);
};

console.log = (...args) => {
    if (!squelch)
        originalConsoleLog(...args);
};

// Setup testing tracer
let _tracerRegex = new RegExp('^\\s*at .*' + filename.replace('.', '\\.') + ':([0-9]+):([0-9]+)', 'gi');
let tracer = (...args) => {
    if (typeof args[0] === 'string' && args[0].indexOf('{point}') >= 0) {
        let e = new Error();
        let stack = e.stack.split('\n');
        let lastTestLines = '';
        stack.forEach(line => {
            _tracerRegex.lastIndex = 0;
            let m = _tracerRegex.exec(line);
            if (m)
                lastTestLines = 'line ' + m[1] + ', column ' + m[2];
        });
        args[0] = args[0].replace(/\{point\}/gi, lastTestLines);
    }

    if (trace) {
        console.trace(...args);
    } else {
        originalConsoleLog(...args);
    }
};


if (verbose)
    _console_log('Starting shapeOf unit tests...');

const shapeOf = require('./index.js');

// Create a simple unit testing object.
let failed = 0;
let passed = 0;
let markStart = () => {
    if (verbose)
        _console_log(`Test ${failed+passed} executing...`);
};
let markFailed = () => {
    if (verbose)
        _console_log(`Test ${failed+passed} failed.`);
    failed++;
};
let markPassed = () => {
    if (verbose)
        _console_log(`Test ${failed+passed} passed.`);
    passed++;
};
let expect = (expr) => {
    return {
        isTruthy: () => {
            markStart();
            if (!expr) {
                tracer('\n\u001b[31mFailed\u001b[0m ({point})' +
                       '\n       expected: a truthy value' +
                       '\n       result:   ' + expr);
                markFailed();
            } else {
                markPassed();
            }
        },
        isFalsy: () => {
            markStart();
            if (expr) {
                tracer('\n\u001b[31mFailed\u001b[0m ({point})' +
                       '\n       expected: a falsy value' +
                       '\n       result:   ' + expr);
                markFailed();
            } else {
                markPassed();
            }
        },
        is: (val) => {
            markStart();
            if (expr != val) {
                tracer('\n\u001b[31mFailed\u001b[0m ({point})' +
                       '\n       expected: ' + val +
                       '\n       result:   ' + expr);
                markFailed();
            } else {
                markPassed();
            }
        }
    };
};

// Setup shared callbacks and objects.
let callbackVal;
let valid = (obj, schema) => {
    callbackVal = true;
};
let invalid = (obj, schema) => {
    callbackVal = false;
};
let result;
let caught;
let errorObj;
let errorObjCaught;
let fooValidator;
let doubleMutator;
let addOneMutator;
let uppercaseMutator;
let lowercaseMutator;
let obj;
let obj2;
let obj2Schema;
let obj3;
let obj3Schema;
let schemaToSerialize;
let serializedSchemaTest;
let serializedSchema;
let deserializedSchema;
let reserializedSchema;
let serializedExpr;
let schemaExpr;
let resultsSchema;
let resultsObj;
let results;
let mutatorResultsSchema;



//
// Tests
//



// Testing types and exact value matches
expect(
    shapeOf({'foo': 'bar'}).shouldBe({'foo': shapeOf.string})
).isTruthy();
expect(
    shapeOf({'foo': 'bar'}).shouldBe({'foo': 'biz'})
).isFalsy();
expect(
    shapeOf({'foo': 'bar'}).is({'foo': shapeOf.string})
).isTruthy();
expect(
    shapeOf({'foo': 'bar'}).is({'foo': 'biz'})
).isFalsy();


// Testing nesting
expect(
    shapeOf({'foo': {'bar': 'baz'}}).shouldBe({'foo': {'bar': shapeOf.string}})
).isTruthy();

expect(
    shapeOf({'foo': 'bar'}).shouldBe({'foo': {'bar': shapeOf.string}})
).isFalsy();

// Testing .oneOfType()
expect(
    shapeOf(null).shouldBe(shapeOf.oneOfType([shapeOf.string, shapeOf.array]))
).isFalsy();

expect(
    shapeOf(null).shouldBe(shapeOf.oneOfType([shapeOf.string, shapeOf.null]))
).isTruthy();

// Testing .eachOf()
expect(
    shapeOf({foo: 'bar'}).shouldBeExactly(shapeOf.eachOf(
        shapeOf.object,
        {foo: 'bar'},
        shapeOf.objectOf(shapeOf.string)
    ))
).isTruthy();
expect(
    shapeOf({foo: 'bar'}).isExactly(shapeOf.each(
        shapeOf.object,
        {foo: 'bar'},
        shapeOf.objectOf(shapeOf.string)
    ))
).isTruthy();
expect(
    shapeOf({foo: 'bar'}).shouldBeExactly(shapeOf.eachOf(
        shapeOf.object,
        {foo: 'bar'},
        shapeOf.objectOf(shapeOf.string),
        shapeOf.null
    ))
).isFalsy();
expect(
    shapeOf({
        'foo': 'bar',
        'baz': 42
    }).shouldBe({
        'foo': shapeOf.eachOf(
            shapeOf.string.matching(/^b/gi),
            shapeOf.string.ofSize(3)
        ),
        'baz': shapeOf.eachOf(
            shapeOf.integer.greaterThanOrEqualTo(10),
            shapeOf.integer.lessThanOrEqualTo(50)
        )
    })
).isTruthy();

// Testing arrays
expect(
    shapeOf([]).shouldBe(shapeOf.array)
).isTruthy();

expect(
    shapeOf([1,2,3]).shouldBe(shapeOf.arrayOf(shapeOf.number))
).isTruthy();

expect(
    shapeOf([1,'a',3]).shouldNotBe(shapeOf.arrayOf(shapeOf.number))
).isTruthy();

expect(
    shapeOf([1,'a',3]).shouldBe(shapeOf.arrayOf(shapeOf.oneOfType(shapeOf.number, shapeOf.string)))
).isTruthy();

expect(
    shapeOf([1,'a',3]).shouldBe(shapeOf.arrayOf(shapeOf.oneOfType([shapeOf.number, shapeOf.string])))
).isTruthy();


// Testing objects
expect(
    shapeOf([1,2,3]).shouldBe(shapeOf.objectOf(shapeOf.number))
).isTruthy();

expect(
    shapeOf({foo: 1, bar: 2, baz: 3}).shouldBe(shapeOf.objectOf(shapeOf.number))
).isTruthy();

expect(
    shapeOf({foo: 'a', bar: 2, baz: 3}).shouldBe(shapeOf.objectOf(shapeOf.number))
).isFalsy();


// Testing enumerations
expect(
    shapeOf('Test').shouldBe(shapeOf.oneOf(['Test', 'This']))
).isTruthy();

expect(
    shapeOf('Test').shouldBe(shapeOf.oneOf('Test', 'This'))
).isTruthy();

expect(
    shapeOf({'foo': {'bar': 'baz'}}).shouldBe({'foo': {'bar': shapeOf.oneOf(['biz', 'bom', 'baz'])}})
).isTruthy();

expect(
    shapeOf({'foo': 'baz'}).shouldBe({'foo': {'bar': shapeOf.oneOf(['biz', 'bom', 'baz'])}})
).isFalsy();


// Testing primitives
expect(
    shapeOf(null).shouldBe(shapeOf.primitive)
).isTruthy();

expect(
    shapeOf('').shouldBe(shapeOf.string)
).isTruthy();

expect(
    shapeOf('').shouldBe(shapeOf.object)
).isFalsy();

expect(
    shapeOf([]).shouldBe(shapeOf.primitive)
).isFalsy();

expect(
    shapeOf({}).shouldBe(shapeOf.primitive)
).isFalsy();

expect(
    shapeOf(4.2).shouldBe(shapeOf.integer)
).isFalsy();

expect(
    shapeOf(-4.2).shouldBe(shapeOf.integer)
).isFalsy();

expect(
    shapeOf(42).shouldBe(shapeOf.integer)
).isTruthy();


// Testing optional fields
expect(
    shapeOf({foo: 'a', bar: 2, baz: 3}).shouldBe({foo: shapeOf.string, bar: shapeOf.number, bom: shapeOf.optional.primitive})
).isTruthy();

expect(
    shapeOf({'foo': 'bar'}).shouldBe({'foo': shapeOf.optional.number})
).isFalsy();


// Testing callbacks for .onValid()/.onInvalid()
result = shapeOf([1,2,3]).onValid(valid).onInvalid(invalid).shouldBe(shapeOf.arrayOf(shapeOf.number));
expect(callbackVal).isTruthy();

result = shapeOf([1,2,3]).onValid(valid).onInvalid(invalid).shouldBe(shapeOf.arrayOf(shapeOf.string));
expect(callbackVal).isFalsy();


// Testing .throwsOnInvalid/.throwsOnInvalid()
caught = false;
try {
    shapeOf('foo').throwsOnInvalid.shouldBe(shapeOf.null);
} catch {
    caught = true;
}
expect(caught).isTruthy();

try {
    result = shapeOf([1,2,3]).onValid(valid).onInvalid(invalid).throwsOnInvalid.shouldBe(shapeOf.arrayOf(shapeOf.string));
} catch {
    result = 123;
}
expect(result).is(123);
expect(callbackVal).is(false); // both .onInvalid() callback and the catch to .throwsOnInvalid block should execute

errorObj = new Error('Test error');
try {
    result = shapeOf([1,2,3]).throwsOnInvalid(errorObj).onValid(valid).onInvalid(invalid).shouldBe(shapeOf.arrayOf(shapeOf.string));
} catch (error) {
    errorObjCaught = error;
}
expect(errorObjCaught).is(errorObj);


// Testing custom validators
fooValidator = (obj) => { if (obj === 'bar') return obj };
expect(
    shapeOf({'foo': 'bar'}).shouldBe({'foo': fooValidator})
).isTruthy();
expect(
    shapeOf(['bar', 'bar', 'bar']).shouldBe(shapeOf.arrayOf(fooValidator))
).isTruthy();
expect(
    shapeOf(['foo', 'bar', 'bar']).shouldBe(shapeOf.arrayOf(fooValidator))
).isFalsy();


// Testing .shouldBeExactly()
expect(
    shapeOf({'foo': 'bar', 'baz': 'biz'}).shouldBeExactly({'foo': shapeOf.string})
).isFalsy();
expect(
    shapeOf({'foo': 'bar', 'baz': 'biz'}).shouldBeExactly({'foo': shapeOf.string, 'baz': 'biz'})
).isTruthy();
expect(
    shapeOf({'foo': 'bar', 'baz': 'biz', 'bom': {'bam': 'bim', 'bem': 'bom'}}).shouldBeExactly({'foo': shapeOf.string, 'baz': 'biz', 'bom': {'bam': shapeOf.string}})
).isFalsy();
expect(
    shapeOf({'foo': 'bar', 'baz': 'biz'}).shouldBeExactly({'foo': 'bar', 'baz': shapeOf.optional.string})
).isTruthy();


// Testing number ranges (for both number and integer types)
expect(
    shapeOf(42).shouldBeExactly(shapeOf.number.range(0, 42))
).isTruthy();
expect(
    shapeOf(42).shouldBeExactly(shapeOf.number.range(42, 0))
).isTruthy();
expect(
    shapeOf(0).shouldBeExactly(shapeOf.number.range(42, 1))
).isFalsy();
expect(
    shapeOf({'foo': 42}).shouldBeExactly({'foo': shapeOf.optional.number.range(0, 42)})
).isTruthy();
expect(
    shapeOf(100).shouldBeExactly(shapeOf.number.min(100))
).isTruthy();
expect(
    shapeOf(42).shouldBeExactly(shapeOf.optional.number.min(-1))
).isTruthy();
expect(
    shapeOf(-2).shouldBeExactly(shapeOf.optional.number.greaterThanOrEqualTo(-2))
).isTruthy();
expect(
    shapeOf(42).shouldBeExactly(shapeOf.optional.number.lessThanOrEqualTo(42))
).isTruthy();
expect(
    shapeOf(42).shouldBeExactly(shapeOf.number.max(-1))
).isFalsy();
expect(
    shapeOf({'foo': 42}).shouldBeExactly({'foo': shapeOf.number, 'bar': shapeOf.optional.number.max(42)})
).isTruthy();

expect(
    shapeOf(42).shouldBeExactly(shapeOf.integer.range(0, 42))
).isTruthy();
expect(
    shapeOf(42).shouldBeExactly(shapeOf.integer.range(42, 0))
).isTruthy();
expect(
    shapeOf(0).shouldBeExactly(shapeOf.integer.range(42, 1))
).isFalsy();
expect(
    shapeOf({'foo': 42}).shouldBeExactly({'foo': shapeOf.optional.integer.range(0, 42)})
).isTruthy();
expect(
    shapeOf(100).shouldBeExactly(shapeOf.integer.min(100))
).isTruthy();
expect(
    shapeOf(42).shouldBeExactly(shapeOf.optional.integer.min(-1))
).isTruthy();
expect(
    shapeOf(-2).shouldBeExactly(shapeOf.optional.integer.min(-2))
).isTruthy();
expect(
    shapeOf(42).shouldBeExactly(shapeOf.optional.integer.max(42))
).isTruthy();
expect(
    shapeOf(42).shouldBeExactly(shapeOf.integer.max(-1))
).isFalsy();
expect(
    shapeOf({'foo': 42}).shouldBeExactly({'foo': shapeOf.integer, 'bar': shapeOf.optional.integer.max(42)})
).isTruthy();

expect(
    shapeOf(4.2).shouldBeExactly(shapeOf.optional.integer.max(42))
).isFalsy();
expect(
    shapeOf({'foo': 4.2}).shouldBeExactly({'foo': shapeOf.integer, 'bar': shapeOf.optional.integer.max(42)})
).isFalsy();

// Testing string lengths
expect(
    shapeOf('test').shouldBeExactly(shapeOf.string.size(4))
).isTruthy();
expect(
    shapeOf('test').shouldBeExactly(shapeOf.string.size(1, 4))
).isTruthy();
expect(
    shapeOf('test').shouldBeExactly(shapeOf.string.ofSize(5, 4))
).isTruthy();
expect(
    shapeOf('test').shouldBeExactly(shapeOf.string.ofSize(5, 10))
).isFalsy();

// Testing string patterns
expect(
    shapeOf('Hello world!').shouldBeExactly(shapeOf.string.pattern(/^he[l]{2,2}o ....d!$/gi))
).isTruthy();
expect(
    shapeOf('Hello world!').shouldBeExactly(shapeOf.string.pattern('^he[l]{2,2}o ....d!$', 'gi'))
).isTruthy();
expect(
    shapeOf('Hello world!').shouldBeExactly(shapeOf.string.pattern(/^he[l]{2,2}o ....d!$/i, 'g'))
).isFalsy();
expect(
    shapeOf({
        'foo': 'bar',
    }).shouldBeExactly({
        'foo': shapeOf.string.matching(/^b..$/gi),
    })
).isTruthy();
expect(
    shapeOf({
        'baz': 'biz',
    }).shouldBeExactly({
        'baz': shapeOf.string.matching(/^..z$/gi)
    })
).isTruthy();
expect(
    shapeOf({
        'foo': 'bar',
        'baz': 'biz',
    }).shouldBeExactly({
        'foo': shapeOf.string.matching(/^b..$/gi),
        'baz': shapeOf.string.matching(/^..z$/gi)
    })
).isTruthy();

// Testing string email address patterns
expect(
    shapeOf('jeff@jeff-allen.dev').shouldBeExactly(shapeOf.string.ofEmail)
).isTruthy();
expect(
    shapeOf('foo@bar@baz.com').shouldBeExactly(shapeOf.string.ofEmail)
).isFalsy();
expect(
    shapeOf('@baz.com').shouldBeExactly(shapeOf.string.ofEmail)
).isFalsy();
expect(
    shapeOf('.jeff@jeff-allen.dev').shouldBeExactly(shapeOf.string.email)
).isFalsy();
expect(
    shapeOf('.jeff@jeff-allen.dev').shouldBeExactly(shapeOf.string.email)
).isFalsy();
expect(
    shapeOf('jeff@-jeff-allen.dev').shouldBeExactly(shapeOf.string.email)
).isFalsy();
expect(
    shapeOf('jeff@jeff-allen.web').shouldBeExactly(shapeOf.string.email)
).isFalsy();
expect(
    shapeOf('jeff@[192.168.0.100]').shouldBeExactly(shapeOf.string.email)
).isTruthy();
expect(
    shapeOf('jeff@[192.168.0.256]').shouldBeExactly(shapeOf.string.email)
).isFalsy();

// Testing string IPv4 patterns
expect(
    shapeOf('192.168.1.1').shouldBeExactly(shapeOf.string.IPv4)
).isTruthy();
expect(
    shapeOf('192.168.01.1').shouldBeExactly(shapeOf.string.IPv4)
).isFalsy();
expect(
    shapeOf('0.0.0.0').shouldBeExactly(shapeOf.string.IPv4)
).isTruthy();
expect(
    shapeOf('0.0.0.0 ').shouldBeExactly(shapeOf.string.IPv4)
).isFalsy();
expect(
    shapeOf(' 1.1.1.1').shouldBeExactly(shapeOf.string.IPv4)
).isFalsy();

// Testing string IPv6 patterns
expect(
    shapeOf('::1').shouldBeExactly(shapeOf.string.IPv6)
).isTruthy();
expect(
    shapeOf('fe80::').shouldBeExactly(shapeOf.string.IPv6)
).isTruthy();
expect(
    shapeOf('2001::').shouldBeExactly(shapeOf.string.IPv6)
).isTruthy();
expect(
    shapeOf('fe80:0000:0000:0000:0100:61ef:fe00:f156').shouldBeExactly(shapeOf.string.IPv6)
).isTruthy();
expect(
    shapeOf('fe80:0:0:0:100:61ef:fe00:f156').shouldBeExactly(shapeOf.string.IPv6)
).isTruthy();
expect(
    shapeOf('fe80::100:61ef:fe00:f156').shouldBeExactly(shapeOf.string.IPv6)
).isTruthy();
expect(
    shapeOf('fe80:0000:0000:0000:0100:61ef:10.0.0.100').shouldBeExactly(shapeOf.string.IPv6)
).isTruthy();
expect(
    shapeOf('fe80:0:0:0:0100:61ef:10.0.0.100').shouldBeExactly(shapeOf.string.IPv6)
).isTruthy();
expect(
    shapeOf('fe80::100:61ef:10.0.0.100').shouldBeExactly(shapeOf.string.IPv6)
).isTruthy();


// Testing array lengths
expect(
    shapeOf([1,2,3]).shouldBeExactly(shapeOf.array.ofSize(3))
).isTruthy();
expect(
    shapeOf([1,2,3]).shouldBeExactly(shapeOf.array.ofSize(4))
).isFalsy();
expect(
    shapeOf([1,2,3]).shouldBeExactly(shapeOf.array.ofSize(1, 4))
).isTruthy();
expect(
    shapeOf([1,2,3]).shouldBeExactly(shapeOf.array.ofSize(4, 1))
).isTruthy();
expect(
    shapeOf([1,2,3]).shouldBeExactly(shapeOf.arrayOf(shapeOf.number).ofSize(4, 1))
).isTruthy();
expect(
    shapeOf([1,'a',3]).shouldBeExactly(shapeOf.arrayOf(shapeOf.number).ofSize(4, 1))
).isFalsy();
expect(
    shapeOf([1,'a',3]).shouldBeExactly(shapeOf.arrayOf(shapeOf.number, shapeOf.string).ofSize(4, 1))
).isTruthy();
expect(
    shapeOf([1,2,3]).shouldBeExactly(shapeOf.arrayOf(shapeOf.number).ofSize(3))
).isTruthy();

// Testing mutation
doubleMutator = (obj) => {
    if (typeof obj === 'object' && typeof obj.foo === 'number') {
        obj.foo = obj.foo * 2;
        return obj;
    }
};
addOneMutator = (obj) => {
    if (typeof obj === 'number')
        return obj + 1;
};
uppercaseMutator = (obj) => {
    if (typeof obj === 'string')
        return obj.toUpperCase();
};
lowercaseMutator = (obj) => {
    if (typeof obj === 'string')
        return obj.toLowerCase();
};
obj = {
    'foo': 2
};
obj2 = {
    first: {
        'foo': 100
    },
    second: 41,
    third: 'hello',
    fourth: ['FOO', 'BAR']
};
obj2Schema = {
    first: doubleMutator,
    second: addOneMutator,
    third: uppercaseMutator,
    fourth: shapeOf.arrayOf(lowercaseMutator)
};
obj3 = {
    first: 'foo',
    second: 'bar',
    third: 'baz'
};
obj3Schema = {
    first: uppercaseMutator,
    second: uppercaseMutator,
    third: uppercaseMutator
};
expect(
    shapeOf(obj).shouldBe(doubleMutator)
).isTruthy();
expect(
    obj.foo
).is(4);
expect(
    shapeOf(42).returnsObject.shouldBe(addOneMutator)
).is(43);
expect(
    shapeOf(obj2).shouldBe(obj2Schema)
).isTruthy();
expect(
    obj2.first.foo
).is(200);
expect(
    obj2.second
).is(42);
expect(
    obj2.third
).is('HELLO');
expect(
    obj2.fourth.length
).is(2);
expect(
    obj2.fourth[0] + ' ' + obj2.fourth[1]
).is('foo bar');
expect(
    shapeOf(obj3).shouldBe(obj3Schema)
).isTruthy();
expect(
    obj3.first
).is('FOO');
expect(
    obj3.second
).is('BAR');
expect(
    obj3.third
).is('BAZ');

// Test serialization
obj = {
    "first_name": "Foo",
    "last_name": "Bar",
    "title": "Dr.",
    "sex": "Other",
    "three_favorite_things": ["Pizza", "Ice Cream", "Sandwiches"],
};
schemaToSerialize = {
    "first_name": shapeOf.string.ofSize(3, 25),
    "last_name": "Bar",
    "title": shapeOf.optional.string.ofSize(2, 15),
    "sex": shapeOf.oneOf("Male", "Female", "Other"),
    "three_favorite_things": shapeOf.arrayOf(shapeOf.string, shapeOf.number).ofSize(3)
};
serializedSchemaTest = {
    "_shapeOfVersion": shapeOf.version,
    "_shapeOfSchemaVersion": shapeOf.compatibleSchemaVersion,
    "schema": {
        "type": "object",
        "value": [
            {
                "type": "field",
                "name": "first_name",
                "value": {
                    "type": "validator",
                    "name": "shapeOf.string.size",
                    "callChain": [
                        {
                            "name": "shapeOf.string",
                            "args": []
                        },
                        {
                            "name": "shapeOf.string.size",
                            "args": [
                                {
                                    "type": "primitive",
                                    "value": 3
                                },
                                {
                                    "type": "primitive",
                                    "value": 25
                                }
                            ]
                        }
                    ]
                }
            },
            {
                "type": "field",
                "name": "last_name",
                "value": {
                    "type": "primitive",
                    "value": "Bar"
                }
            },
            {
                "type": "field",
                "name": "title",
                "value": {
                    "type": "validator",
                    "name": "shapeOf.optional.string.size",
                    "optional": true,
                    "callChain": [
                        {
                            "name": "shapeOf.optional.string",
                            "args": []
                        },
                        {
                            "name": "shapeOf.optional.string.size",
                            "args": [
                                {
                                    "type": "primitive",
                                    "value": 2
                                },
                                {
                                    "type": "primitive",
                                    "value": 15
                                }
                            ]
                        }
                    ]
                }
            },
            {
                "type": "field",
                "name": "sex",
                "value": {
                    "type": "validator",
                    "name": "shapeOf.oneOf",
                    "callChain": [
                        {
                            "name": "shapeOf.oneOf",
                            "args": [
                                {
                                    "type": "primitive",
                                    "value": "Male"
                                },
                                {
                                    "type": "primitive",
                                    "value": "Female"
                                },
                                {
                                    "type": "primitive",
                                    "value": "Other"
                                }
                            ]
                        }
                    ]
                }
            },
            {
                "type": "field",
                "name": "three_favorite_things",
                "value": {
                    "type": "validator",
                    "name": "shapeOf.arrayOf.size",
                    "callChain": [
                        {
                            "name": "shapeOf.arrayOf",
                            "args": [
                                {
                                    "type": "validator",
                                    "name": "shapeOf.string",
                                    "callChain": [
                                        {
                                            "name": "shapeOf.string",
                                            "args": []
                                        }
                                    ]
                                },
                                {
                                    "type": "validator",
                                    "name": "shapeOf.number",
                                    "callChain": [
                                        {
                                            "name": "shapeOf.number",
                                            "args": []
                                        }
                                    ]
                                }
                            ]
                        },
                        {
                            "name": "shapeOf.arrayOf.size",
                            "args": [
                                {
                                    "type": "primitive",
                                    "value": 3
                                }
                            ]
                        }
                    ]
                }
            }
        ]
    }
};
serializedSchema = JSON.parse(shapeOf.serialize(schemaToSerialize));
expect(
    shapeOf(serializedSchema).shouldBeExactly(serializedSchemaTest)
).isTruthy();

deserializedSchema = shapeOf.deserialize(shapeOf.serialize(schemaToSerialize));
reserializedSchema = JSON.parse(shapeOf.serialize(deserializedSchema));
expect(
    shapeOf(reserializedSchema).shouldBeExactly(serializedSchemaTest)
).isTruthy();

expect(
    shapeOf(obj).shouldBeExactly(shapeOf.deserialize(reserializedSchema))
).isTruthy();

serializedExpr = shapeOf.serialize(shapeOf.string.pattern(/^test-pattern$/gi));
schemaExpr = shapeOf.deserialize(serializedExpr);
expect(
    shapeOf('TEST-PATTERN').shouldBe(schemaExpr)
).isTruthy();


// Test results using .returnsResults
resultsSchema = {
    'foo': shapeOf.string,
    'bar': shapeOf.string,
};
resultsObj = {
    'foo': 42,
    'bar': 'baz',
};
results = shapeOf(resultsObj).returnsResults.shouldBe(resultsSchema);
expect(
    results.log.length
).is(3);
expect(
    results.log[0].message.startsWith('Failed')
).isTruthy();
expect(
    results.success
).isFalsy();

mutatorResultsSchema = {
    'foo': (obj) => {if (typeof obj === 'number') return obj + 1;},
    'bar': (obj) => {if (typeof obj === 'string') return obj.toUpperCase();},
};
results = shapeOf(resultsObj).returnsResults.shouldBe(mutatorResultsSchema);
expect(
    results.log.length
).is(4);
expect(
    results.success
).isTruthy();
expect(
    results.log[0].message.startsWith('Mutation')
).isTruthy();


// 
// Results
// 
 
 
_console_log(`Results: ${passed} of ${(passed + failed)} passed.`);

if (failed > 0)
    process.exit(1);