# shapeOf v0.0.7
A lightweight schema validator and object mutator for JSON endpoints and Plain Old JavaScript Objects (POJOs). 

Features include:
- **Clear Syntax**: The shapeOf library was developed with simplicity in mind. Defined schemas are intended to be semantical and quick for a reader to understand.
- **Flexible**: Schemas can be defined as anything from simple data types to elaborate schemas with custom validators.
- **Customizable**: Custom validators can be introduced as sole functions, or can be wrapped as official validators that extend existing validators.
- **Vaildator Pipeline**: Multiple validators can be applied to a single value, ensuring data is shaped exactly as intended.
- **Mix-and-Match**: Combinations of validators and/or mutators can be applied to a single value using the shapeOf.eachOf composite validator.
- **Mutators**: Validators can also be written as mutators, altering the object in question throughout the validation pipeline.
- **Validation Details**: A validation process can generate details on why an object is invalid and/or which values mutated.
- **Serializable Schemas**: Schemas can be serialized for storage or delivery and reconstituted through parsing the serialization later.
- **No Dependencies**: shapeOf has no dependencies, helping to keep overall project size small.


## Table of Contents
1. [Installation](#installation)
2. [Basic Usage](#basic-usage)
3. [Strict Shape Enforcement](#strict-shape-enforcement)
4. [Optional Object Fields](#optional-object-fields)
5. [Type Validators](#type-validators)
    1. [Primitive Type Validators](#primitive-type-validators)
        1. [Primitive Number Type: Ranges, Minimums, and Maximums](#primitive-number-type-ranges-minimums-and-maximums)
        2. [Primitive String Type: Length](#primitive-string-type-length)
        3. [Primitive String Type: Regular Expressions](#primitive-string-type-regular-expressions)
        4. [Primitive String Type: IP Addresses](#primitive-string-type-ip-addresses)
        5. [Primitive String Type: Email](#primitive-string-type-email)
        6. [Primitive Array Type: Size](#primitive-array-type-size)
    2. [Composite/Strict Type Validators](#compositestrict-type-validators)
        1. [Composite Array Type: Size](#composite-array-type-size)
    3. [Custom Validators](#custom-validators)
        1. [Simple Custom Validators](#simple-custom-validators)
        2. [Advanced Custom Validators](#advanced-custom-validators)
6. [Mutators](#mutators)
7. [Throwing Exceptions](#throwing-exceptions)
8. [Capturing Result Details](#capturing-result-details)
9. [Event Listeners](#event-listeners)
10. [Serializing Schemas](#serializing-schemas)
11. [License](#license)


## Installation

```
npm install shape-of
```


## Basic Usage
A simple example of the `shapeOf()` function uses the `.is()` function to evaluate an object against a schema, which either returns a true or false value:
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
let passingResult = shapeOf(obj).is(schema);   // true

```
```javascript
// Invalid object shape ('foo' field is a number)
let schema = {
  'foo': shapeOf.string
};
let malformedObj = {
  'foo': 42
};
let failingResult = shapeOf(malformedObj).is(schema);   // false
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
let result = shapeOf(obj).is(schema);   // true
```

A call to `shapeOf()` will only perform validation once `.is()` or `.isExactly()` has been subsequently called.


## Strict Shape Enforcement
Strict enforcement of object shapes are achieved with the `.isExactly()` function, which will fail objects with extraneous fields:
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
let passingResult = shapeOf(obj).isExactly(schema);   // true

// Invalid object shape (contains the extraneous field 'bom', which isn't included in the schema)
let malformedObj = {
  'foo': 'bar',
  'baz': 'biz',
  'bom': 'bim'
};
let failingResult = shapeOf(malformedObj).shouldBeExactly(schema);   // false
```


## Optional Object Fields
By default, any object fields described within a shapeOf schema are assumed as required fields. A schema describing an object type can include optional fields by using the `.optional` toggle with a standard shapeOf type validator. For example:
```javascript
let schema = {
  'foo': shapeOf.string,
  'baz': shapeOf.optional.number   // the 'baz' field is optional
};
let obj = {
  'foo': 'bar'
};
let result = shapeOf(obj).is(schema);   // true, despite a missing optional 'baz' field
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
| Validator Function | Description |
| ------------------ | ----------- |
| `shapeOf.number.range(min, max)`<br>`shapeOf.integer.range(min, max)`| Validates if the number is between or at the `min` and `max` values |
| `shapeOf.number.min(min)`<br>`shapeOf.integer.min(min)`<br>`shapeOf.number.greaterThanOrEqualTo(min)`<br>`shapeOf.integer.greaterThanOrEqualTo(min)` | Validates if the number is above or at the `min` value |
| `shapeOf.number.max(max)`<br>`shapeOf.integer.max(max)`<br>`shapeOf.number.lessThanOrEqualTo(max)`<br>`shapeOf.integer.lessThanOrEqualTo(max)` | Validates if the number is above or at the `max` value |

#### Primitive String Type: Length
The `shapeOf.string` validator also supports minimum, maximum, and exact lengths:
| Validator Function | Description |
| ------------------ | ----------- |
| `shapeOf.string.size(exact)`<br>`shapeOf.string.ofSize(exact)` | Validates if the string has the `exact` character count |
| `shapeOf.string.size(min, max)`<br>`shapeOf.string.ofSize(min, max)` | Validates if the string has a character count between `min` and `max` |

#### Primitive String Type: Regular Expressions
The `shapeOf.string` validator also supports regular expressions:
| Validator Function | Description |
| ------------------ | ----------- |
| `shapeOf.string.pattern(regex)`<br>`shapeOf.string.matching(regex)` | Validates if the string matches the given pattern `regex`, which can be either a string or a RegExp object |
| `shapeOf.string.pattern(regex, flags)`<br>`shapeOf.string.matching(regex, flags)` | Validates if the string matches the given pattern `regex` using `flags`, which `regex` can be either a string or a RegExp object |

#### Primitive String Type: IP Addresses
The `shapeOf.string` validator also supports validating the IPv4 and IPv6 formats:
| Validator Function | Description |
| ------------------ | ----------- |
| `shapeOf.string.ipv4`<br>`shapeOf.string.IPv4`<br>`shapeOf.string.ofIPv4` | Validates if the string is of an IPv4 format. |
| `shapeOf.string.ipv6`<br>`shapeOf.string.IPv6`<br>`shapeOf.string.ofIPv6` | Validates if the string is of an IPv6 format. |

#### Primitive String Type: Email
The `shapeOf.string` validator also supports validating the IPv4 format:
| Validator Function | Description |
| ------------------ | ----------- |
| `shapeOf.string.email`<br>`shapeOf.string.ofEmail` | Validates if the string is of an email format.<br>_NOTE: This won't validate email addresses themselves, rather just the syntax._ |

#### Primitive Array Type: Size
The `shapeOf.array` validator also supports array sizes, which can be an exact element count or within a range of element counts:
| Validator Function | Description |
| ------------------ | ----------- |
| `shapeOf.array.size(exact)`<br>`shapeOf.array.ofSize(exact)` | Validates if the array has the `exact` element count |
| `shapeOf.array.size(min, max)`<br>`shapeOf.array.ofSize(min, max)` | Validates if the array has an element count between `min` and `max` |


### Composite/Strict Type Validators
In addition to primitive types, composites of primitive types are supported as well:
| Composite Type | shapeOf Validator | Description |
| -------------- | ----------------- | ----------- |
| Array Of <...> | `shapeOf.arrayOf(...)` | Validates an array whose elements are of one or more types |
| Object Of <...> | `shapeOf.objectOf(...)` | Validates an object whose values are of one or more types |
| One Of <...>   | `shapeOf.oneOf(...)` | Validates a value from an enumerated list of one or more values |
| One Of Type <...> | `shapeOf.oneOfType(...)` | Validates an object to be of one of a set of types |
| Each Of Type <...> | `shapeOf.eachOfType(...)` | Validates an object as being each of a set of types |

An example of using composite validators:
```javascript
// Passing shapeOf.arrayOf()
let obj = ['foo', 'bar', 42, null];
let schema = shapeOf.arrayOf(shapeOf.string, shapeOf.number, shapeOf.null);
let result = shapeOf(obj).is(schema);   // true

// Failing shapeOf.arrayOf()
obj = [1, 2, 3];
schema = shapeOf.arrayOf(shapeOf.string);
result = shapeOf(obj).is(schema);   // false

// Passing shapeOf.objectOf()
obj = {
  'foo': 'bar',
  'baz': 42
};
schema = shapeOf.objectOf(shapeOf.string, shapeOf.number);
result = shapeOf(obj).is(schema);   // true

// Failing shapeOf.objectOf()
obj = {
  'foo': 'bar',
  'baz': 42
};
schema = shapeOf.objectOf(shapeOf.number);
result = shapeOf(obj).is(schema);   // false

// Passing shapeOf.eachOf()
obj = {
    'foo': 'bar',
    'baz': 42
};
schema = {
    'foo': shapeOf.eachOf(                 // 'foo' field uses two validators
        shapeOf.string.matching(/^b/gi),   // 1: String must start with a 'b'
        shapeOf.string.ofSize(3)           // 2: String must be three characters long
    ),
    'baz': shapeOf.eachOf(                 // 'bar' field uses two validators
        shapeOf.integer.greaterThanOrEqualTo(10),  // 1: Integer must be at least 10
        shapeOf.integer.lessThanOrEqualTo(50)  // 2: Integer must be less than 50
    )
};
result = shapeOf(obj).is(schema);   // true

// Failing shapeOf.eachOf()
obj = {
    'foo': 'bar'
};
schema = {
    'foo': shapeOf.eachOf(                 // 'foo' field uses two 
        shapeOf.string.matching(/^b/gi),   // 1: String must start  with a 'b'
        shapeOf.string.ofSize(4)           // 2: (fails) String must be four characters long
    )
};
result = shapeOf(obj).is(schema);   // false
```

#### Composite Array Type: Size
The `shapeOf.arrayOf()` validator also supports array sizes, which can be an exact element count or within a range of element counts:
| Validator Function | Description |
| ------------------ | ----------- |
| `shapeOf.arrayOf(...).size(exact)`<br>`shapeOf.arrayOf(...).ofSize(exact)` | Validates if the array has the `exact` element count |
| `shapeOf.arrayOf(...).size(min, max)`<br>`shapeOf.arrayOf(...).ofSize(min, max)` | Validates if the array has an element count between `min` and `max` |


### Custom Validators

#### Simple Custom Validators
A developer can introduce a custom validator into the schema by writing a validator function. The validator function should accept a sole argument representing the object in question and returns either some sort of object upon being valid, or undefined if invalid.

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
let result = shapeOf(obj).is(schema);   // true
```

Composite types can also use custom validators for evaluating elements:
```javascript
// Create a simple validator that only passes the string 'bar'
let fooValidator = (obj) => { if (obj === 'bar') return obj };

// Test an array of 'bar' strings against a schema validating array elements using the fooValidator
let obj = ['bar', 'bar', 'bar'];
let schema = shapeOf.arrayOf(fooValidator);
let result = shapeOf(obj).is(schema);   // true

// Test using same schema but against a malformed object
let failingObj = ['foo', 'bar', 'bar'];   // first element will fail, causing .shouldBe() to return false
result = shapeOf(failingObj).is(failingObj);   // false
```

#### Advanced Custom Validators
In addition to validators being a sole function, more advanced validators can be written that allow for sub-validators, or extending existing ones by becoming a sub-validator itself. Sub-validators enable a developer to chain together validators, such as `pattern` being a sub-validator of the `string` validator in `shapeOf.string.pattern()`.

An example of instantiating a custom validator:
```javascript
// Create a validator that checks to see if the object in question is an
// array and has at least one element that equals the string 'bar'.
let arrayWithBar = shapeOf.Validator(
  'myPackage.arrayWithBar',             // The unique name of the validator
  (obj) => {                            // The validator callback 
    if (Array.isArray(obj) && obj.indexOf('bar') > -1)
      return obj;
  }
);
```

To instantiate a new validator, use the `shapeOf.Validator()` function:
<table>
    <thead>
        <tr>
            <th colspan='3'><code>shapeOf.Validator(name, callback, options)</code></th>
        </tr>
        <tr>
            <th>Parameter</th>
            <th colspan='2'>Description</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td>
                <code>name</code><br>
                <em>String</em>
            </td>
            <td colspan='2'>The unique name of the validator. This name should be a dot-delimited namespace with the top-level represeting a package, i.e. <code>shapeOf.number</code>.</td>
        </tr>
        <tr>
            <td>
                <code>callback</code><br>
                <em>Function</em>
            </td>
            <td colspan='2'><p>The function to execute whenever validation occurs. If no arguments are provided to the validator when defining the schema, the function should have only one argument representing the object in question passed to it.</p>
            <p>If additional arguments are needed, they can be included as the first arguments to the function, with the last being the object in question.</p>
            <p>When additional arguments are needed, they must be defined during instantiation of the schema. For instance, the validator <code>shapeOf.string.ofSize</code> accepts up to three arguments, with the first representing the minimum/maximum lengths and the last being the object. The callback to this then could be defined as either three individual arguments, or a set of variadic arguments.</p>
            </td>
        </tr>
        <tr>
            <td><code>options</code><br><em>Object</em></td>
            <td colspan='2'>Key-value paired options used to configure the validator. The following list describes keys and their values:<br>
                <ul>
                    <li>
                        <code><strong>parent</strong></code><br>
                        <em>String</em>, <em>Validator</em><br>
                        The parent validator to attach this to as a sub-validator. This value should either be the name of the parent or a Validator object serving as the parent. Upon attachment, this validator becomes available within the parent's validator chain, i.e. a sub-validator named <code>ofSize</code> or <code>shapeOf.string.ofSize</code> would become an accessible as <code>shapeOf.string.ofSize()</code> when the parent is set as <code>'shapeOf.string'</code>.
                    </li>
                    <li>
                        <code><strong>aliases</strong></code><br>
                        <em>String</em>, <em>Array&lt;String&gt;</em><br>
                        Alternative names for the validator. If attached to another validator as a sub-validator, both the name and aliases can be used to access the validator. For instance, if a validator's name is <code>pattern</code>, has the alias <code>regex</code>, and is attached as a sub-validator to <code>shapeOf.string</code>, then that validator could be referenced using either the statement <code>shapeOf.string.pattern</code> or <code>shapeOf.string.regex</code>.
                    </li>
                    <li>
                        <code><strong>optional</strong></code><br>
                        <em>Boolean</em><br>
                        Marks this validator as optional. When evaluating objects, if a field is absent but its validator is marked as optional, the object is still considered valid.
                    </li>
                    <li>
                        <code><strong>requiredArgsCount</strong></code><br>
                        <em>Integer</em><br>
                        <em>Defaults as 0</em>. The minimum number of required arguments for this validator. For example, if a validator named <code>regex</code> has its requiredArgsCount set to 1, any schema utilizing the function will throw an error if no arguments are provided.
                    </li>
                </ul>
            </td>
        </tr>
    </tbody>
</table>


## Mutators
Mutators are validators that alter the value(s) of the object(s) in question. Some things to note about mutation and mutators:
- Mutation should only occur within a mutator if the object is first considered valid.
- Mutators should be avoided whenever possible. As schemas become more complex, it may become difficult to track how an object has changed through a validator pipeline.

An example mutator:
```javascript
// Create a mutating validator that ensures an object is a string, and then converts it
// to uppercase.
let stringToUppercase = (obj) => {
    if (typeof obj === 'string')
        return obj.toUpperCase();
};
let obj = {
    'foo': 'bar'
};
let schema = {
    'foo': stringToUppercase
};

let result = shapeOf(obj).is(schema);   // true, and mutates obj.foo to be 'BAR'

console.log(obj.foo);   // outputs 'BAR'
```

Resulting objects from a validation can also be returned from a `shapeOf()` call by using the `.returnsObject` toggle. This comes in handy for primitive mutators that aren't nested within an object:
```javascript
// Create our string mutator.
let stringToUppercase = (obj) => {
    if (typeof obj === 'string')
        return obj.toUpperCase();
};
let obj = 'foo';
let schema = stringToUppercase;

// By using the .returnsObject toggle, the returned result is instead the object in
// question after mutation. In the event validation had failed, the resulting value
// would've been undefined.
let result = shapeOf(obj).returnsObject.is(schema);   // 'FOO'
```


## Throwing Exceptions
An evaluation of an object using `shapeOf()` can optionally throw an exception. To do so, add `.throwsOnInvalid` after a `shapeOf()` call:
```javascript
let obj = [1, 2, 3];
let schema = shapeOf.arrayOf(shapeOf.string);
let result = shapeOf(obj).throwsOnInvalid.is(schema);   // throws an exception
```

Custom exceptions can also be thrown by calling `.throwsOnInvalid()` and providing the error object as an argument:
```javascript
let obj = {
  'foo': 'bar'
};
let schema = shapeOf.objectOf(shapeOf.number);
let customException = new Error('Custom exception');

try {
  shapeOf(obj).throwsOnInvalid(customException).is(schema);
} catch (exception) {
  // this executes with exception === customException
  console.log('An exception was thrown during a shapeOf() validation', exception);
}
```


## Capturing Result Details
If details are needed on why an object is failing validation, the `.returnsResults` toggle can be used after a `shapeOf()` call:
```javascript
let schema = {
    'foo': shapeOf.string
};
let malformedObj = {
    'foo': 42
};

// Generate detailed results by using .returnsResults
let results = shapeOf(malformedObj).returnsResults.is(schema);

// results = {
//   success: false,
//   log: [
//     {
//       message: "Failed: Validator 'shapeOf.string'",
//       obj: 42
//     },
//     {
//       message: "Failed: Object at key 'foo'",
//       obj: 42
//     },
//     {
//       message: "Failed: Object",
//       obj: { foo: 42 }
//     }
//   ],
//   obj: { foo: 42, bar: 'baz'}
// }
```

When results are returned from a validation, it comes in the form of an object that includes three fields; `success`, `log`, and `obj`. The `success` field is a boolean that will be false if validation fails. The `log` array lists out specifics on what happened during validation, including mutations and failed objects. And the `obj` field contains the object in question, including mutations.


## Event Listeners
shapeOf supports event listeners for when validation fails, passes, and/or completes:
| Function Name | Description | Listener Parameters |
| ------------- | ----------- | ------------------- |
| `shapeOf().onValid(callback)` | Executes `callback` whenever validation passes. | **`obj`**<br>_Object_<br> The object being evaluated<br> **`schema`**<br>_Object_<br> The schema object |
| `shapeOf().onInvalid(callback)` | Executes `callback` whenever validation fails. |  **`obj`**<br>_Object_<br> The object being evaluated<br> **`schema`**<br>_Object_<br> The schema object |
| `shapeOf().onComplete(callback)` | Executes `callback` whenever validation completes. If an exception is thrown, `callback` is NOT executed. |  **`obj`**<br>_Object_<br> The object being evaluated<br> **`schema`**<br>_Object_<br> The schema object |


Example of handling a passed validation by adding the `.onValid()` chain call after a `shapeOf()` call:
```javascript
let validHandler = (obj) => console.log('Passed validation', obj);
let obj = {
  'foo': 'bar'
};
let schema = shapeOf.object;
let result = shapeOf(obj).onValid(validHandler).is(schema);   // true, and console output: Passed validation  {'foo': 'bar'}
```

Example of handling a failed validation by adding the `.onInvalid()` chain call after a `shapeOf()` call:
```javascript
let invalidHandler = (obj) => console.log('Failed validation', obj);
let obj = {
  'foo': 'bar'
};
let schema = shapeOf.array;
let result = shapeOf(obj).onInvalid(invalidHandler).is(schema);   // false, and console output: Failed validation  {'foo': 'bar'}
```

Example of handling a completed validation by adding the `.onComplete()` chain call after a `shapeOf()` call:
```javascript
let completeHandler = (obj) => console.log('Validation complete', obj);
let obj = {
  'foo': 'bar'
};
let schema = shapeOf.object;
let result = shapeOf(obj).onComplete(completeHandler).is(schema);   // true, and console output: Validation complete  {'foo': 'bar'}
```


## Serializing Schemas
Schemas can be serialized by using the `shapeOf.serialize()` function:
```javascript
let schema = {
    'first_name': shapeOf.string.ofSize(3, 50),
    'last_name': shapeOf.string.ofSize(3, 50),
};

let serializedSchema = shapeOf.serialize(schema);   // returns a JSON-encoded string of the serialized schema
```

Schemas can then be reconstituted using the `shapeOf.deserialize()` function:
```javascript
let schema = {
    'first_name': shapeOf.string.ofSize(3, 50),
    'last_name': shapeOf.string.ofSize(3, 50),
};

let serializedSchema = shapeOf.serialize(schema);   // returns a JSON-encoded string of the serialized schema

let originalSchema = shapeOf.deserialize(serializedSchema);   // returns a schema equivalent to the 'schema' object
```


## License

MIT License

Copyright (c) 2021 Jeff Allen

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.