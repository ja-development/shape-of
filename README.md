# shapeOf
A lightweight schema validator for JSON endpoints and Plain Old JavaScript Objects (POJOs).

## Installation

```
npm install shape-of
```

## Basic Usage
A simple example of the `shapeOf()` function uses the `.shouldBe()` function to evaluate an object against a schema, which either returns a true or false value:
```javascript
// Define a schema that expects an object with a 'foo' field, which is expected to be a string
let schema = {
  'foo': shapeOf.string
};

// Object with valid shape
let obj = {
  'foo': 'bar'
};

// Execute validation and store results in passingResult
let passingResult = shapeOf(obj).shouldBe(schema);   // true
```
```javascript
// Invalid object shape ('foo' field is a number)
let schema = {
  'foo': shapeOf.string
};
let malformedObj = {'foo': 42};
let failingResult = shapeOf(malformedObj).shouldBe(schema);   // false
```

Nesting is also supported:
```javascript
// Validate using a schema that defines an object within an object containing a string field with the key 'bar'
let schema = {
  'foo': {
    'bar': shapeOf.string
  }
};
let obj = {
  'foo': {
    'bar': 'baz'
  }
};
let result = shapeOf(obj).shouldBe(schema);   // true
```

A call to `shapeOf()` will only perform validation once `.shouldBe()` or `.shouldBeExactly()` has been subsequently called.

## Strict Shape Enforcement
Strict enforcement of object shapes be achieved with the `.shouldBeExactly()` function, which will fail objects with extraneous fields:
```javascript
// Define the schema
let schema = {
  'foo': shapeOf.string,
  'baz': shapeOf.string
};

// Valid object shape with an exact shape match
let obj = {
  'foo': 'bar',
  'baz': 'biz'
};
let passingResult = shapeOf(obj).shouldBeExactly(schema);   // true

// Invalid object shape (contains the extraneous field 'bom', which isn't included in the schema)
let malformedObj = {
  'foo': 'bar',
  'baz': 'biz',
  'bom': 'bim'
};
let failingResult = shapeOf(malformedObj).shouldBeExactly(schema);   // false
```

## Optional Object Fields
A schema describing an object type can include optional fields by using the `.optional` toggle with a standard shapeOf type validator. For example:
```javascript
let obj = {
  'foo': 'bar'
};
let schema = {
  'foo': shapeOf.string,
  'baz': shapeOf.optional.number   // the 'baz' field is optional
};
let result = shapeOf(obj).shouldBe(schema);   // true, despite a missing optional 'baz' field
```

## Type Validators

### Primitive Type Validators
shapeOf supports validating the following primitive data types by default:
| Data Type | shapeOf Validator |
| --------- | ----------------- |
| String    | `shapeOf.string`  |
| Array     | `shapeOf.array`   |
| Boolean   | `shapeOf.bool`    |
| Number    | `shapeOf.number`  |
| Integer   | `shapeOf.integer` |
| Object    | `shapeOf.object`  |
| Null      | `shapeOf.null`    |
| Primitive | `shapeOf.primitive` |

*NOTE: The primitive data type includes strings, booleans, numbers, integers, and null.*

#### Primitive Number Type: Ranges, Minimums, and Maximums
The `shapeOf.number` and `shapeOf.integer` validators also support ranges, minimums, and maximums:
| Function | Description |
| -------- | ----------- |
| `shapeOf.number.range(min, max)`<br>`shapeOf.integer.range(min, max)`| Validates if the number is between or at the `min` and `max` values |
| `shapeOf.number.min(min)`<br>`shapeOf.integer.min(min)`<br>`shapeOf.number.greaterThanOrEqualTo(min)`<br>`shapeOf.integer.greaterThanOrEqualTo(min)` | Validates if the number is above or at the `min` value |
| `shapeOf.number.max(max)`<br>`shapeOf.integer.max(max)`<br>`shapeOf.number.lessThanOrEqualTo(max)`<br>`shapeOf.integer.lessThanOrEqualTo(max)` | Validates if the number is above or at the `max` value |

#### Primitive String Type: Length
The `shapeOf.string` validator also supports minimum, maximum, and exact lengths:
| Function | Description |
| -------- | ----------- |
| `shapeOf.string.size(exact)`<br>`shapeOf.string.ofSize(exact)` | Validates if the string has the `exact` character count |
| `shapeOf.string.size(min, max)`<br>`shapeOf.string.ofSize(min, max)` | Validates if the string has a character count between `min` and `max` |

### Composite/Strict Type Validators
In addition to primitive types, composites of primitive types are supported as well:
| Composite Type | shapeOf Validator | Description |
| -------------- | ----------------- | ----------- |
| Array Of <...> | `shapeOf.arrayOf()` | Validates an array whose elements are of one or more types |
| Object Of <...> | `shapeOf.objectOf()` | Validates an object whose values are of one or more types |
| One Of <...>   | `shapeOf.oneOf()` | Validates a value from an enumerated list of one or more values |
| One Of Type <...> | `shapeOf.oneOfType()` | Validates an object to be of one of a set of types |

An example of using composite validators:
```javascript
// Passing shapeOf.arrayOf()
let obj = ['foo', 'bar', 42, null];
let schema = shapeOf.arrayOf(shapeOf.string, shapeOf.number, shapeOf.null);
let result = shapeOf(obj).shouldBe(schema);   // true

// Failing shapeOf.arrayOf()
obj = [1, 2, 3];
schema = shapeOf.arrayOf(shapeOf.string);
result = shapeOf(obj).shouldBe(schema);   // false

// Passing shapeOf.objectOf()
obj = {
  'foo': 'bar',
  'baz': 42
};
schema = shapeOf.objectOf(shapeOf.string, shapeOf.number);
result = shapeOf(obj).shouldBe(schema);   // true

// Failing shapeOf.objectOf()
obj = {
  'foo': 'bar',
  'baz': 42
};
schema = shapeOf.objectOf(shapeOf.number);
result = shapeOf(obj).shouldBe(schema);   // false
```

### Custom Validators
A developer can introduce a custom validator into the schema by writing a validator function. The validator function should accept a sole argument representing the object in question and returns either the object itself upon being valid, or undefined if invalid.

A custom validator example:
```javascript
// Create a simple validator that only passes the string 'bar'
let fooValidator = (obj) => { if (obj === 'bar') return obj };

// Test an object with a field that'll pass using fooValidator
let obj = {
  'foo': 'bar'
};
let schema = {
  'foo': fooValidator   // the field 'foo' must pass fooValidator, which requires the value to be 'bar'
};
let result = shapeOf(obj).shouldBe(schema);   // true
```

Composite types can also use custom validators for evaluating elements:
```javascript
// Create a simple validator that only passes the string 'bar'
let fooValidator = (obj) => { if (obj === 'bar') return obj };

// Test an array of 'bar' strings against a schema validating array elements using the fooValidator
let obj = ['bar', 'bar', 'bar'];
let schema = shapeOf.arrayOf(fooValidator);
let result = shapeOf(obj).shouldBe(schema);   // true

// Test using same schema but against a malformed object
let failingObj = ['foo', 'bar', 'bar'];   // first element will fail, causing .shouldBe() to return false
result = shapeOf(failingObj).shouldBe(failingObj);   // false
```

## Throwing Exceptions
An evaluation of an object using shapeOf() can optionally throw an exception. To do so, add `.throwsOnInvalid` after a `shapeOf()` call:
```javascript
let obj = [1, 2, 3];
let schema = shapeOf.arrayOf(shapeOf.string);
let result = shapeOf(obj).throwsOnInvalid.shouldBe(schema);   // throws an exception
```

Custom exceptions can also be thrown by calling `.throwsOnInvalid()` and providing the error object as an argument:
```javascript
let obj = {
  'foo': 'bar'
};
let schema = shapeOf.objectOf(shapeOf.number);
let customException = new Error('Custom exception');

try {
  shapeOf(obj).throwsOnInvalid(customException).shouldBe(schema);
} catch (exception) {
  // this executes with exception === customException
  console.log('An exception was thrown during a shapeOf() validation', exception);
}
```

## Validation Event Listeners
shapeOf supports event listeners for when validation fails, passes, and/or completes:
| Function Name | Description | Listener Parameters |
| ------------- | ----------- | ------------------- |
| `shapeOf().onValid(callback)` | Executes `callback` whenever validation passes. | `obj`: the object being evaluated<br> `schema`: the schema object |
| `shapeOf().onInvalid(callback)` | Executes `callback` whenever validation fails. | `obj`: the object being evaluated<br> `schema`: the schema object |
| `shapeOf().onComplete(callback)` | Executes `callback` whenever validation completes. If an exception is thrown, `callback` is NOT executed. | `obj`: the object being evaluated<br> `schema`: the schema object |


Example of handling a passed validation by adding the `.onValid()` chain call after a `shapeOf()` call:
```javascript
let validHandler = (obj) => console.log('Passed validation', obj);
let obj = {
  'foo': 'bar'
};
let schema = shapeOf.object;
let result = shapeOf(obj).onValid(validHandler).shouldBe(schema);   // true, and console output: Passed validation  {'foo': 'bar'}
```

Example of handling a failed validation by adding the `.onInvalid()` chain call after a `shapeOf()` call:
```javascript
let invalidHandler = (obj) => console.log('Failed validation', obj);
let obj = {
  'foo': 'bar'
};
let schema = shapeOf.array;
let result = shapeOf(obj).onInvalid(invalidHandler).shouldBe(schema);   // false, and console output: Failed validation  {'foo': 'bar'}
```

Example of handling a completed validation by adding the `.onComplete()` chain call after a `shapeOf()` call:
```javascript
let completeHandler = (obj) => console.log('Validation complete', obj);
let obj = {
  'foo': 'bar'
};
let schema = shapeOf.object;
let result = shapeOf(obj).onComplete(completeHandler).shouldBe(schema);   // true, and console output: Validation complete  {'foo': 'bar'}
```
