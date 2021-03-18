/*
 * shapeOf
 * Unit Tests
 */

const shapeOf = require('./index.js');

// Create a simple unit testing object. Converted from jest test plan.
let failed = 0;
let passed = 0;
let expect = (expr) => {
	return {
		toBeTruthy: () => {
			if (!expr) {
				console.trace('\n\u001b[31mFailed\u001b[0m, expected: a truthy value' +
					          '\n        result:   ' + expr);
				failed++;
			} else {
				passed++;
			}
		},
		toBeFalsy: () => {
			if (expr) {
				console.trace('\n\u001b[31mFailed\u001b[0m, expected: a falsy value' +
					          '\n        result:   ' + expr);
				failed++;
			} else {
				passed++;
			}
		},
		toBe: (val) => {
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

// Tests.
expect(
	shapeOf('').shouldBe(shapeOf.string)
).toBeTruthy();

expect(
	shapeOf('').shouldBe(shapeOf.object)
).toBeFalsy();

expect(
	shapeOf([]).shouldBe(shapeOf.array)
).toBeTruthy();

expect(
	shapeOf({'foo': 'bar'}).shouldBe({'foo': shapeOf.string})
).toBeTruthy();

expect(
	shapeOf({'foo': {'bar': 'baz'}}).shouldBe({'foo': {'bar': shapeOf.string}})
).toBeTruthy();

expect(
	shapeOf({'foo': 'bar'}).shouldBe({'foo': {'bar': shapeOf.string}})
).toBeFalsy();

expect(
	shapeOf('Test').shouldBe(shapeOf.oneOf(['Test', 'This']))
).toBeTruthy();

expect(
	shapeOf('Test').shouldBe(shapeOf.oneOf('Test', 'This'))
).toBeTruthy();

expect(
	shapeOf({'foo': {'bar': 'baz'}}).shouldBe({'foo': {'bar': shapeOf.oneOf(['biz', 'bom', 'baz'])}})
).toBeTruthy();

expect(
	shapeOf({'foo': 'baz'}).shouldBe({'foo': {'bar': shapeOf.oneOf(['biz', 'bom', 'baz'])}})
).toBeFalsy();

expect(
	shapeOf(null).shouldBe(shapeOf.oneOfType([shapeOf.string, shapeOf.array]))
).toBeFalsy();

expect(
	shapeOf(null).shouldBe(shapeOf.oneOfType([shapeOf.string, shapeOf.null]))
).toBeTruthy();

expect(
	shapeOf([1,2,3]).shouldBe(shapeOf.arrayOf(shapeOf.number))
).toBeTruthy();

expect(
	shapeOf([1,'a',3]).shouldNotBe(shapeOf.arrayOf(shapeOf.number))
).toBeTruthy();

expect(
	shapeOf([1,'a',3]).shouldBe(shapeOf.arrayOf(shapeOf.oneOfType(shapeOf.number, shapeOf.string)))
).toBeTruthy();

expect(
	shapeOf([1,'a',3]).shouldBe(shapeOf.arrayOf(shapeOf.oneOfType([shapeOf.number, shapeOf.string])))
).toBeTruthy();

expect(
	shapeOf([1,2,3]).shouldBe(shapeOf.objectOf(shapeOf.number))
).toBeTruthy();

expect(
	shapeOf({foo: 1, bar: 2, baz: 3}).shouldBe(shapeOf.objectOf(shapeOf.number))
).toBeTruthy();

expect(
	shapeOf({foo: 'a', bar: 2, baz: 3}).shouldBe(shapeOf.objectOf(shapeOf.number))
).toBeFalsy();

expect(
	shapeOf(null).shouldBe(shapeOf.primitive)
).toBeTruthy();

expect(
	shapeOf([]).shouldBe(shapeOf.primitive)
).toBeFalsy();

expect(
	shapeOf({}).shouldBe(shapeOf.primitive)
).toBeFalsy();

expect(
	shapeOf({foo: 'a', bar: 2, baz: 3}).shouldBe({foo: shapeOf.string, bar: shapeOf.number, bom: shapeOf.optional.primitive})
).toBeTruthy();

let caught = false;
try {
	shapeOf('foo').throwsOnInvalid.shouldBe(shapeOf.null);
} catch {
	caught = true;
}
expect(caught).toBeTruthy();

let callbackVal;
let valid = (obj, schema) => {
	callbackVal = true;
};
let invalid = (obj, schema) => {
	callbackVal = false;
};
let result = shapeOf([1,2,3]).onValid(valid).onInvalid(invalid).shouldBe(shapeOf.arrayOf(shapeOf.number));
expect(callbackVal).toBeTruthy();

result = shapeOf([1,2,3]).onValid(valid).onInvalid(invalid).shouldBe(shapeOf.arrayOf(shapeOf.string));
expect(callbackVal).toBeFalsy();

try {
	result = shapeOf([1,2,3]).onValid(valid).onInvalid(invalid).throwsOnInvalid.shouldBe(shapeOf.arrayOf(shapeOf.string));
} catch {
	result = 123;
}
expect(result).toBe(123);
expect(callbackVal).toBe(false);

expect(
	shapeOf({'foo': 'bar'}).shouldBe({'foo': shapeOf.optional.number})
).toBeFalsy();


// Results.
console.log(`Results: ${passed} of ${(passed + failed)} passed.`);

if (failed > 0)
	process.exit(1)