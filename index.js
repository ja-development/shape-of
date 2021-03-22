/*
 * shapeOf
 * Core Library
 * 
 * A lightweight schema validator for JSON endpoints.
 * 
 * 
 * Copyright (c) 2021 Jeff Allen
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

;let shapeOf;

(function() {

shapeOf = function(obj) {
	return _buildActions(this, obj);
};

/**
 * Create an object that returns after using one of the following:
 * 
 *  - shouldBe
 *  - shouldBeExactly
 *  - shouldNotBe
 *  - throwsOnInvalid
 *  - onValid
 *  - onInvalid
 *  
 * These allow for chained calls directly after an initial shapeOf() call.
 *
 * @param      {object}  thisObj  The 'this' object, which is the shapeOf function
 * @param      {object}  obj      The object who's schema is in question
 * @param      {object}  options  The accumulated options from the shapeOf chain calls
 * @return     {object}  An object for making chained calls
 */
let _buildActions = (thisObj, obj, options) => {
	options = options || {};
	let exclude = options.exclude || [];
	let rtn = {};

	if (options.baseObject) {
		rtn = options.baseObject;
		delete options.baseObject;
	}

	delete options.exclude;

	if (exclude.indexOf('shouldBe') === -1)
		rtn.shouldBe = _shouldBe.bind(thisObj, { obj, ...options });

	if (exclude.indexOf('shouldBeExactly') === -1)
		rtn.shouldBeExactly = _shouldBe.bind(thisObj, { obj, exact: true, ...options });

	if (exclude.indexOf('shouldNotBe') === -1)
		rtn.shouldNotBe = ((obj, schema) => !_shouldBe(obj, schema)).bind(thisObj, { obj, ...options });

	if (exclude.indexOf('throwsOnInvalid') === -1)
		rtn.throwsOnInvalid = _buildThrowsOnExceptionActions(thisObj, obj, options);

	if (exclude.indexOf('onInvalid') === -1)
		rtn.onInvalid = _onInvalid.bind(thisObj, thisObj, { obj, ...options });

	if (exclude.indexOf('onValid') === -1)
		rtn.onValid = _onValid.bind(thisObj, thisObj, { obj, ...options });

	if (exclude.indexOf('onComplete') === -1)
		rtn.onComplete = _onComplete.bind(thisObj, thisObj, { obj, ...options });

	return rtn;
};

/**
 * Builds actions specifically for the .throwsOnException/.throwsOnException() fields.
 *
 * @param      {object}  thisObj  The 'this' object, which is the shapeOf function
 * @param      {object}  options  The options
 * @param      {object}  options  The accumulated options from the shapeOf chain calls
 * @return     {Function}  The .throwsOnException actions.
 */
let _buildThrowsOnExceptionActions = (thisObj, obj, options) => {
	let extOptions = {
		obj,
		exclude: ['throwsOnInvalid'],
		throwOnInvalid: true,
		...options
	};
	extOptions.baseObject = _throwsOnInvalid.bind(thisObj, thisObj, extOptions);
	return _buildActions(thisObj, obj, extOptions);
};

/**
 * Builds the actions on a shapeOf().throwsOnInvalid() call and sets the 
 *
 * @param      {object}  thisObj  The 'this' object, which is the shapeOf function
 * @param      {object}  options  The accumulated options from the shapeOf chain calls
 * @param      {object}  errorObj  The error object to throw if validation fails
 * @return     {object}  An object for making chained calls
 */
let _throwsOnInvalid = (thisObj, options, errorObj) => {
	if (errorObj) {
		options.errorObj = errorObj;
	}
	return _buildThrowsOnExceptionActions(thisObj, options.obj, options);
};

/**
 * Builds the actions on a shapeOf().onInvalid() call and adds a callback to the onInvalid list.
 * 
 * @param      {object}  thisObj  The 'this' object, which is the shapeOf function
 * @param      {object}  options  The accumulated options from the shapeOf chain calls
 * @param      {Function}  callback  The callback to execute on an invalid evaluation
 * @return     {object}  An object for making chained calls
 */
let _onInvalid = (thisObj, options, callback) => {
	let callbacks = options.onInvalid || [];
	callbacks.push(callback);
	return _buildActions(thisObj, options.obj, {onInvalid: callbacks, ...options});
};

/**
 * Builds the actions on a shapeOf().onValid() call and adds a callback to the onValid list.
 * 
 * @param      {object}  thisObj  The 'this' object, which is the shapeOf function
 * @param      {object}  options  The accumulated options from the shapeOf chain calls
 * @param      {Function}  callback  The callback to execute on a valid evaluation
 * @return     {object}  An object for making chained calls
 */
let _onValid = (thisObj, options, callback) => {
	let callbacks = options.onValid || [];
	callbacks.push(callback);
	return _buildActions(thisObj, options.obj, {onValid: callbacks, ...options});
};

/**
 * Builds the actions on a shapeOf().onComplete() call and adds a callback to the onComplete list.
 * 
 * NOTE: If .throwsOnInvalid has been toggled and an invalid evaluation occurs, the onComplete callbacks
 *       don't execute.
 *  
 * @param      {object}  thisObj  The 'this' object, which is the shapeOf function
 * @param      {object}  options  The accumulated options from the shapeOf chain calls
 * @param      {Function}  callback  The callback to execute after a valid evaluation, or an invalid evaluation without a .throwsOnInvalid toggle
 * @return     {object}  An object for making chained calls
 */
let _onComplete = (thisObj, options, callback) => {
	let callbacks = options.onComplete || [];
	callbacks.push(callback);
	return _buildActions(thisObj, options.obj, {onComplete: callbacks, ...options});
};

/**
 * Called whenever shapeOf().shouldBe is called.
 *
 * @param      {object}  options  The accumulated options from the shapeOf chain calls
 * @param      {object}   schema   The schema supplied by the .shouldBe() call
 * @return     {boolean}  True if object in question follows provided schema
 */
let _shouldBe = (options, schema) => {
	let obj = options.obj;
	let rtn = false;
	if (typeof schema === 'function') {
		rtn = typeof schema(obj) !== 'undefined';
	} else if (typeof schema === 'object') {
		rtn = typeof _object(obj, schema, options) !== 'undefined';
	} else {
		// rtn = typeof schema === typeof obj;
		rtn = schema === obj;
	}
	if (options.onInvalid && !rtn) {
		options.onInvalid.forEach(callback => callback(obj, schema));
	}
	if (options.onValid && rtn) {
		options.onValid.forEach(callback => callback(obj, schema));
	}
	if (options.throwOnInvalid && !rtn) {
		if (options.errorObj)
			throw options.errorObj;
		else
			throw 'Invalid shape detected';
	}
	if (options.onComplete) {
		options.onComplete.forEach(callback => callback(obj, schema));
	}
	return rtn;
};

/**
 * Handles evaluating an object describing a schema provided with a .shouldBe() call.
 *
 * @param      {object}   obj     The object in question
 * @param      {object}   schema  The schema described as an object
 * @param      {object}   options  The accumulated options from the shapeOf chain calls
 * @return     {boolean}  True if object matches schema
 */
let _object = (obj, schema, options) => {
	if (typeof obj !== 'object')
		return;

	let exact = options.exact || false;

	let schemaKeys = Object.keys(schema);
	for (let i = schemaKeys.length - 1; i >= 0; i--) {
		let schemaKey = schemaKeys[i];
		let expected = schema[schemaKey];
		if (typeof obj[schemaKey] === 'undefined') {
			if (!expected._optional)
				return;
			else
				continue;
		}
		let valInQuestion = obj[schemaKey];

		if (!_shouldBe({...options, obj: valInQuestion}, expected))
			return;
	}

	if (exact) {
		// Exact schema - ensure no extraneous fields are present
		let objKeys = Object.keys(obj);
		for (let i = objKeys.length - 1; i >= 0; i--) {
			if (schemaKeys.indexOf(objKeys[i]) === -1)
				return;
		}
	}

	return true;
};

/**
 * Validator for number types.
 *
 * @param      {object}  obj     The object in question
 * @return     {object}  Returns the object if valid, undefined otherwise
 */
shapeOf.number = (obj) => {
	if (typeof obj === 'number')
		return obj;
};
shapeOf.number._validator = true;

/**
 * Validator generator for number types within a specific range.
 *
 * @param      {number}  min     The lower acceptable range for the number
 * @param      {number}  max     The upper acceptable range for the number
 * @return     {Function}  Returns an validator function specific to the number range
 */
shapeOf.number.range = function(min, max) {
	let rtn = _number_range.bind(null, min, max);
	rtn._validator = true;
	rtn._optional = this._optional;
	return rtn;
};
shapeOf.number.range._validator = true;

/**
 * Validator function used in validator generation from the shapeOf.number.range() function.
 *
 * @param      {number}    min     The minimum
 * @param      {number}    max     The maximum
 * @param      {number}    obj     The object in question
 * @return     {object}  Returns the object if valid, undefined otherwise
 */
let _number_range = (min, max, obj) => {
	let nmin = Math.min(min, max);
	let nmax = Math.max(min, max);
	if (typeof obj === 'number') {
		if (obj <= nmax && obj >= nmin)
			return obj;
	}
};

/**
 * Validator generator for number types with a min value.
 *
 * @param      {number}  min     The lower acceptable range for the number
 * @return     {Function}  Returns an validator function specific to the number range
 */
shapeOf.number.min = function(min) {
	let rtn = _number_min.bind(null, min);
	rtn._validator = true;
	rtn._optional = this._optional;
	return rtn;
};
shapeOf.number.greaterThanOrEqualTo = shapeOf.number.min;

/**
 * Validator function used in validator generation from the shapeOf.number.min() function.
 *
 * @param      {number}    min     The minimum
 * @param      {number}    obj     The object in question
 * @return     {object}  Returns the object if valid, undefined otherwise
 */
let _number_min = (min, obj) => {
	if (typeof obj === 'number') {
		if (obj >= min)
			return obj;
	}
};

/**
 * Validator generator for number types with a max value.
 *
 * @param      {number}  max     The upper acceptable range for the number
 * @return     {Function}  Returns an validator function specific to the number range
 */
shapeOf.number.max = function(max) {
	let rtn = _number_max.bind(null, max);
	rtn._validator = true;
	rtn._optional = this._optional;
	return rtn;
};
shapeOf.number.lessThanOrEqualTo = shapeOf.number.max;

/**
 * Validator function used in validator generation from the shapeOf.number.max() function.
 *
 * @param      {number}    max     The maximum
 * @param      {number}    obj     The object in question
 * @return     {object}  Returns the object if valid, undefined otherwise
 */
let _number_max = (max, obj) => {
	if (typeof obj === 'number') {
		if (obj <= max)
			return obj;
	}
};

/**
 * Validator for integer types.
 *
 * @param      {object}  obj     The object in question
 * @return     {object}  Returns the object if valid, undefined otherwise
 */
shapeOf.integer = (obj) => {
	if (_isInteger(obj)) {
		return obj;
	}
};
shapeOf.integer._validator = true;

/**
 * Validator generator for integer types within a specific range.
 *
 * @param      {number}  min     The lower acceptable range for the number
 * @param      {number}  max     The upper acceptable range for the number
 * @return     {Function}  Returns an validator function specific to the number range
 */
shapeOf.integer.range = function(min, max) {
	let rtn = _integer_range.bind(null, min, max);
	rtn._validator = true;
	rtn._optional = this._optional;
	return rtn;
};
shapeOf.integer.range._validator = true;

/**
 * Validator function used in validator generation from the shapeOf.integer.range() function.
 *
 * @param      {number}    min     The minimum
 * @param      {number}    max     The maximum
 * @param      {number}    obj     The object in question
 * @return     {object}  Returns the object if valid, undefined otherwise
 */
let _integer_range = (min, max, obj) => {
	let nmin = Math.min(min, max);
	let nmax = Math.max(min, max);
	if (_isInteger(obj)) {
		if (obj <= nmax && obj >= nmin)
			return obj;
	}
};

/**
 * Validator generator for integer types with a min value.
 *
 * @param      {number}  min     The lower acceptable range for the number
 * @return     {Function}  Returns an validator function specific to the number range
 */
shapeOf.integer.min = function(min) {
	let rtn = _integer_min.bind(null, min);
	rtn._validator = true;
	rtn._optional = this._optional;
	return rtn;
};
shapeOf.integer.greaterThanOrEqualTo = shapeOf.integer.min;

/**
 * Validator function used in validator generation from the shapeOf.integer.min() function.
 *
 * @param      {number}    min     The minimum
 * @param      {number}    obj     The object in question
 * @return     {object}  Returns the object if valid, undefined otherwise
 */
let _integer_min = (min, obj) => {
	if (_isInteger(obj)) {
		if (obj >= min)
			return obj;
	}
};

/**
 * Validator generator for integer types with a max value.
 *
 * @param      {number}  max     The upper acceptable range for the number
 * @return     {Function}  Returns an validator function specific to the number range
 */
shapeOf.integer.max = function(max) {
	let rtn = _integer_max.bind(null, max);
	rtn._validator = true;
	rtn._optional = this._optional;
	return rtn;
};
shapeOf.integer.lessThanOrEqualTo = shapeOf.integer.max;

/**
 * Validator function used in validator generation from the shapeOf.integer.max() function.
 *
 * @param      {number}    max     The maximum
 * @param      {number}    obj     The object in question
 * @return     {object}  Returns the object if valid, undefined otherwise
 */
let _integer_max = (max, obj) => {
	if (_isInteger(obj)) {
		if (obj <= max)
			return obj;
	}
};

/**
 * Validator for string types.
 *
 * @param      {object}  obj     The object in question
 * @return     {object}  Returns the object if valid, undefined otherwise
 */
shapeOf.string = (obj) => {
	if (typeof obj === 'string')
		return obj;
};
shapeOf.string._validator = true;

/**
 * Validator generator for string types of a given length or range of length.
 *
 * @param      {number}    minOrExact  The minimum or exact character count
 * @param      {number}    max         The maximum character count
 * @return     {Function}    Returns a validator function specific to the string length
 */
shapeOf.string.size = function(minOrExact, max) {
	if (typeof max === 'undefined') {
		// Exact length
		let rtn = _string_exactLength.bind(null, minOrExact);
		rtn._validator = true;
		rtn._optional = this._optional;
		return rtn;
	} else {
		// Ranging length
		let nmin = Math.min(minOrExact, max);
		let nmax = Math.max(minOrExact, max);
		let rtn = _string_rangeLength.bind(null, nmin, nmax);
		rtn._validator = true;
		rtn._optional = this._optional;
		return rtn;
	}
};
shapeOf.string.ofSize = shapeOf.string.size;

/**
 * Validator function used in validator generation from shapeOf.string.size()/shapeOf.string.ofSize() function.
 *
 * @param      {number}  exact   The exact character count
 * @param      {object}  obj     The object in question
 * @return     {object}  Returns the object if valid, undefined otherwise
 */
let _string_exactLength = (exact, obj) => {
	if (typeof obj === 'string') {
		if (obj.length === exact)
			return obj;
	}
};

/**
 * Validator function used in validator generation from shapeOf.string.size()/shapeOf.string.sizeOf() function.
 *
 * @param      {number}  min     The minimum character count
 * @param      {number}  max     The maximum character count
 * @param      {object}  obj     The object in question
 * @return     {object}  Returns the object if valid, undefined otherwise
 */
let _string_rangeLength = (min, max, obj) => {
	if (typeof obj === 'string') {
		if (obj.length >= min && obj.length <= max)
			return obj;
	}
};

/**
 * Validator generator for string types matching a given pattern.
 *
 * @param      {RegExp|string}  pattern  The pattern
 * @param      {string}      regExpFlags  The flags to use if the pattern argument is a string
 * @return     {Function}    Returns a validator function specific to the string pattern
 */
shapeOf.string.pattern = function(pattern, regExpFlags) {
	if (typeof pattern !== 'string' && !(pattern instanceof RegExp))
		throw 'shapeOf.string.pattern() only accepts strings and RegExp objects as an argument';
	pattern = new RegExp(pattern, regExpFlags);
	if (pattern instanceof RegExp) {
		let rtn = _string_pattern.bind(null, pattern);
		rtn._validator = true;
		rtn._optional = this._optional;
		return rtn;
	}
};

/**
 * Validator function used in validator generation from shapeOf.string.pattern() function.
 *
 * @param      {RegExp}  pattern  The pattern
 * @param      {object}  obj      The object in question
 * @return     {object}  Returns object if valid, undefined otherwise
 */
let _string_pattern = (pattern, obj) => {
	if (typeof obj === 'string') {
		if (pattern.test(obj))
			return obj;
	}
};



/**
 * Validator for array types.
 *
 * @param      {object}  obj     The object in question
 * @return     {object}  Returns the object if valid, undefined otherwise
 */
shapeOf.array = (obj) => {
	if (Array.isArray(obj))
		return obj;
};
shapeOf.array._validator = true;

/**
 * Validator for boolean types.
 *
 * @param      {object}  obj     The object in question
 * @return     {object}  Returns the object if valid, undefined otherwise
 */
shapeOf.bool = (obj) => {
	if (typeof obj === 'boolean')
		return obj;
};
shapeOf.bool._validator = true;
shapeOf.boolean = shapeOf.bool;

/**
 * Validator for object types. Null isn't considered an object and instead passes with shapeOf.null.
 *
 * @param      {object}  obj     The object in question
 * @return     {object}  Returns the object if valid, undefined otherwise
 */
shapeOf.object = (obj) => {
	if (typeof obj === 'object' && obj !== null)
		return obj;
};
shapeOf.object._validator = true;

/**
 * Validator for null types.
 *
 * @param      {object}  obj     The object in question
 * @return     {object}  Returns the object if valid, undefined otherwise
 */
shapeOf.null = (obj) => {
	if (obj === null)
		return obj;
};
shapeOf.null._validator = true;

/**
 * Validator for primitive types, which can be string, boolean, number, or null.
 *
 * @param      {object}  obj     The object in question
 * @return     {object}  Returns the object if valid, undefined otherwise
 */
shapeOf.primitive = (obj) => {
	return shapeOf.string(obj) || shapeOf.bool(obj) || shapeOf.number(obj) || shapeOf.null(obj);
};
shapeOf.primitive._validator = true;

/**
 * Validator for an array of one or more types. Can accept variadic arguments, or a single array containing validators.
 * 
 *   shapeOf.arrayOf(shapeOf.string, shapeOf.number);
 *   shapeOf.arrayOf([shapeOf.string, shapeOf.number]);
 *
 * @param      {Array|Function}  types   The type validators, or a type validator
 * @param      {Array}   args    Additional type validators
 * @return     {Function}  A validator bound to the specific types
 */
shapeOf.arrayOf = (types, ...args) => {
	types = _transformToArray(types, args);
	return _arrayOf.bind(null, types);
};
shapeOf.arrayOf._validator = true;

/**
 * Validator that gets bound to specific types from a shapeOf.arrayOf() call.
 *
 * @param      {Array}   types   An array of type validators
 * @param      {object}  obj     The object in question
 * @return     {object}  Returns the object if is valid, otherwise undefined
 */
let _arrayOf = (types, obj) => {
	if (!Array.isArray(types))
		types = [types];
	if (!Array.isArray(obj))
		return;
	for (let j = obj.length - 1; j >= 0; j--) {
		let validShape = false;
		for (let i = types.length - 1; i >= 0; i--) {
			validShape = validShape || shapeOf(obj[j]).shouldBe(types[i]);
			if (validShape)
				break;
		}
		if (!validShape)
			return;
	}
	return obj;
};

/**
 * Validator for an object whose values are of one or more types. Can accept variadic arguments, or a single array containing validators.
 * 
 *   shapeOf.objectOf(shapeOf.string, shapeOf.number);
 *   shapeOf.objectOf([shapeOf.string, shapeOf.number]);
 *
 * @param      {Array|Function}  types   The type validators, or a type validator
 * @param      {Array}   args    Additional type validators
 * @return     {Function}  A validator bound to the specific types
 */
shapeOf.objectOf = (types, ...args) => {
	types = _transformToArray(types, args);
	return _objectOf.bind(null, types);
};
shapeOf.objectOf._validator = true;

/**
 * Validator that gets bound to specific types from a shapeOf.objectOf() call.
 *
 * @param      {Array}   types   An array of type validators
 * @param      {object}  obj     The object in question
 * @return     {object}  Returns the object if is valid, otherwise undefined
 */
let _objectOf = (types, obj) => {
	if (!Array.isArray(types))
		types = [types];
	if (typeof obj !== 'object' || obj === null)
		return;
	let objKeys = Object.keys(obj);
	for (let j = objKeys.length - 1; j >= 0; j--) {
		let validShape = false;
		let val = obj[objKeys[j]];
		for (let i = types.length - 1; i >= 0; i--) {
			validShape = validShape || shapeOf(val).shouldBe(types[i]);
			if (validShape)
				break;
		}
		if (!validShape)
			return;
	}
	return obj;
};

/**
 * Validator for an object that must strictly equal an object within the list.
 * 
 *   shapeOf.oneOf('foo', 'bar');
 *   shapeOf.oneOf(['foo', 'bar']);
 *
 * @param      {Array|Function}  types   The type validators, or a type validator
 * @param      {Array}   args    Additional type validators
 * @return     {Function}  A validator bound to the specific types
 */
shapeOf.oneOf = (list, ...args) => {
	list = _transformToArray(list, args);
	return _oneOf.bind(null, list);
};
shapeOf.oneOf._validator = true;

/**
 * Validator that gets bound to specific types from a shapeOf.oneOf() call.
 *
 * @param      {Array}   types   An array of type validators
 * @param      {object}  obj     The object in question
 * @return     {object}  Returns the object if is valid, otherwise undefined
 */
let _oneOf = (list, obj) => {
	for (let i = list.length - 1; i >= 0; i--) {
		if (list[i] === obj)
			return obj;
	}
};

/**
 * Validator for an object that must match a specified type of one or more types.
 * 
 *   shapeOf.oneOfType(shapeOf.string, shapeOf.number);
 *   shapeOf.oneOfType([shapeOf.string, shapeOf.number]);
 *
 * @param      {Array|Function}  types   The type validators, or a type validator
 * @param      {Array}   args    Additional type validators
 * @return     {Function}  A validator bound to the specific types
 */
shapeOf.oneOfType = (list, ...args) => {
	list = _transformToArray(list, args);
	return _oneOfType.bind(null, list);
};
shapeOf.oneOfType._validator = true;

/**
 * Validator that gets bound to specific types from a shapeOf.oneOfType() call.
 *
 * @param      {Array}   types   An array of type validators
 * @param      {object}  obj     The object in question
 * @return     {object}  Returns the object if is valid, otherwise undefined
 */
let _oneOfType = (list, obj) => {
	for (let i = list.length - 1; i >= 0; i--) {
		if (shapeOf(obj).shouldBe(list[i]))
			return obj;
	}
};

/**
 * Generates optional equivalents of evaluator functions attached to the provided object, obj.
 * Any function is considered an evaluator function if the ._validator property is truthy on that function.
 * 
 * Once generated, the optional functions are usually attached as the obj.optional object. For example, attaching to shapeOf:
 *   shapeOf.optional.string   // The "optional" evaluator equivalent to shapeOf.string
 *   
 * Optional values are only used within a key-value paired object and apply to the key. Example using shapeOf:
 *   shapeOf({'foo': 'bar'}).shouldBe({'foo': shapeOf.string, 'baz': shapeOf.optional.primitive});   // true
 *
 * @param      {object}  obj     The object to generate optional validators for
 * @return     {object}  An object containing all of the optional equivalents of validator functions attached to obj
 */
let _optional = (obj) => {
	let keys = Object.keys(obj);
	let rtn = {};

	for (let i = keys.length - 1; i >= 0; i--) {
		let key = keys[i];
		let baseFunc = obj[key];
		if (key === 'optional' || key.startsWith('_'))
			continue;
		if (typeof baseFunc !== 'function')
			continue;
		if (!baseFunc._validator)
			continue;

		let optFunc = (...args) => baseFunc(...args);
		let baseFuncKeys = Object.keys(baseFunc);
		for (var j = baseFuncKeys.length - 1; j >= 0; j--) {
			let baseKey = baseFuncKeys[j];
			optFunc[baseKey] = baseFunc[baseKey];
			if (baseFunc[baseKey]._validator)
				optFunc[baseKey]._optional = true;
		}
		optFunc._optional = true;
		rtn[key] = optFunc;
	}

	return rtn;
};

shapeOf.optional = _optional(shapeOf);

/**
 * Utility function use to change either an array or an object and an array of variadic arguments into a single array.
 *
 * @param      {Array|object}  list    Either an array of variadic arguments, or an object
 * @param      {Array}   args    An array of additional variadic arguments
 * @return     {Array}   Normalized array of arguments
 */
let _transformToArray = (list, args) => {
	if (!Array.isArray(list)) {
		list = [list];
		if (args) {
			for (let i = 0; i < args.length; i++) {
				list.push(args[i]);
			}
		}
	}
	return list;
};

/**
 * Determines whether the specified value is an integer. Polyfill for Number.isInteger().
 *
 * @param      {number}   val     The value
 * @return     {boolean}  True if the specified value is an integer, False otherwise.
 */
let _isInteger = Number.isInteger || ((val) => {
	return typeof val === 'number' && val === val && val !== Infinity && val !== -Infinity && Math.floor(val) === val;
});

})();


module.exports = shapeOf;