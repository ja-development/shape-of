/*
 * shapeOf
 * Unit Tests
 */

const shapeOf = require('./index.js');

// Create a simple unit testing object.
let failed = 0;
let passed = 0;
let expect = (expr) => {
	return {
		isTruthy: () => {
			if (!expr) {
				console.trace('\n\u001b[31mFailed\u001b[0m, expected: a truthy value' +
					          '\n        result:   ' + expr);
				failed++;
			} else {
				passed++;
			}
		},
		isFalsy: () => {
			if (expr) {
				console.trace('\n\u001b[31mFailed\u001b[0m, expected: a falsy value' +
					          '\n        result:   ' + expr);
				failed++;
			} else {
				passed++;
			}
		},
		is: (val) => {
			if (expr != val) {
				console.trace('\n\u001b[31mFailed\u001b[0m, expected: ' + val +
					          '\n        result:   ' + expr);
				failed++;
			} else {
				passed++;
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


//
// Tests
//


expect(
	shapeOf({'foo': 'bar'}).shouldBe({'foo': shapeOf.string})
).isTruthy();


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


// Testing optional fields
expect(
	shapeOf({foo: 'a', bar: 2, baz: 3}).shouldBe({foo: shapeOf.string, bar: shapeOf.number, bom: shapeOf.optional.primitive})
).isTruthy();

expect(
	shapeOf({'foo': 'bar'}).shouldBe({'foo': shapeOf.optional.number})
).isFalsy();


// Testing callbacks for .onValid()/.onInvalid()
let result = shapeOf([1,2,3]).onValid(valid).onInvalid(invalid).shouldBe(shapeOf.arrayOf(shapeOf.number));
expect(callbackVal).isTruthy();

result = shapeOf([1,2,3]).onValid(valid).onInvalid(invalid).shouldBe(shapeOf.arrayOf(shapeOf.string));
expect(callbackVal).isFalsy();


// Testing .throwsOnInvalid/.throwsOnInvalid()
let caught = false;
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

let errorObj = new Error('Test error');
let errorObjCaught;
try {
	result = shapeOf([1,2,3]).throwsOnInvalid(errorObj).onValid(valid).onInvalid(invalid).shouldBe(shapeOf.arrayOf(shapeOf.string));
} catch (error) {
	errorObjCaught = error;
}
expect(errorObjCaught).is(errorObj);


// Testing custom validators
let fooValidator = (obj) => { if (obj === 'bar') return obj };
expect(
	shapeOf({'foo': 'bar'}).shouldBe({'foo': fooValidator})
).isTruthy();


// 
// Results
// 
 
 
console.log(`Results: ${passed} of ${(passed + failed)} passed.`);

if (failed > 0)
	process.exit(1);