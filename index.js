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
 * Flatterns a set of variadic arguments that are passed as arrays themselves
 * into a single array.
 *
 * @param      {Array}  argsList  The arguments list
 * @return     {Array}  A flattened list of arguments.
 */
let _flattenArgs = (argsList) => {
	if (Array.isArray(argsList)) {
		let rtn = [];
		for (let i = 0; i < argsList.length; i++) {
			let arg = argsList[i];
			if (Array.isArray(arg)) {
				for (let j = 0; j < arg.length; j++) {
					rtn.push(arg[j]);
				}
			} else {
				rtn.push(arg);
			}
		}
		return rtn;
	} else {
		return argsList;
	}
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

/**
 * Create an object that returns after using one of the following:
 * 
 *  - shouldBe
 *  - shouldBeExactly
 *  - shouldNotBe
 *  - throwsOnInvalid
 *  - onValid
 *  - onInvalid
 *  - onComplete
 *  
 * These allow for chained calls directly after an initial shapeOf() call.
 *
 * @param      {Object}  thisObj  The 'this' object, which is the shapeOf function
 * @param      {Object}  obj      The object who's schema is in question
 * @param      {Object}  options  The accumulated options from the shapeOf chain calls
 * @return     {Object}  An object for making chained calls
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

	if (exclude.indexOf('returnsObject') === -1)
		rtn.returnsObject = _returnsObject(thisObj, { obj, returnsObject: true, ...options });

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
 * @param      {Object}  thisObj  The 'this' object, which is the shapeOf function
 * @param      {Object}  options  The options
 * @param      {Object}  options  The accumulated options from the shapeOf chain calls
 * @return     {Function}  The .throwsOnException actions.
 */
let _buildThrowsOnExceptionActions = (thisObj, obj, options) => {
	let extOptions = {
		obj,
		exclude: ['throwsOnInvalid'],
		throwOnInvalid: true,
		...options
	};
	if (extOptions.returnsObject)
		extOptions.exclude = extOptions.exclude.concat(['returnsObject']);
	extOptions.baseObject = _throwsOnInvalid.bind(thisObj, thisObj, extOptions);
	return _buildActions(thisObj, obj, extOptions);
};

/**
 * Builds the actions on a shapeOf().throwsOnInvalid() call and toggles the validation
 * process to throw an error upon an invalid shape.
 *
 * @param      {Object}  thisObj  The 'this' object, which is the shapeOf function
 * @param      {Object}  options  The accumulated options from the shapeOf chain calls
 * @param      {Object}  errorObj  The error object to throw if validation fails
 * @return     {Object}  An object for making chained calls
 */
let _throwsOnInvalid = (thisObj, options, errorObj) => {
	if (errorObj) {
		options.errorObj = errorObj;
	}
	return _buildThrowsOnExceptionActions(thisObj, options.obj, options);
};

/**
 * Builds the actions of a shapeOf().returnsObject call.
 *
 * @param      {Object}  thisObj  The 'this' object, which is the shapeOf function
 * @param      {Object}  options  The accumulated options from the shapeOf chain calls
 * @param      {Object}  errorObj  The error object to throw if validation fails
 */
let _returnsObject = (thisObj, options) => {
	let extOptions = {
		obj: options.obj,
		returnsObject: true,
		exclude: ['returnsObject'],
		...options
	};
	if (extOptions.throwOnInvalid)
		extOptions.exclude = extOptions.exclude.concat(['throwsOnInvalid']);
	return _buildActions(thisObj, options.obj, extOptions);
};

/**
 * Builds the actions on a shapeOf().onInvalid() call and adds a callback to the onInvalid list.
 * 
 * @param      {Object}  thisObj  The 'this' object, which is the shapeOf function
 * @param      {Object}  options  The accumulated options from the shapeOf chain calls
 * @param      {Function}  callback  The callback to execute on an invalid evaluation
 * @return     {Object}  An object for making chained calls
 */
let _onInvalid = (thisObj, options, callback) => {
	let callbacks = options.onInvalid || [];
	callbacks.push(callback);
	return _buildActions(thisObj, options.obj, {onInvalid: callbacks, ...options});
};

/**
 * Builds the actions on a shapeOf().onValid() call and adds a callback to the onValid list.
 * 
 * @param      {Object}  thisObj  The 'this' object, which is the shapeOf function
 * @param      {Object}  options  The accumulated options from the shapeOf chain calls
 * @param      {Function}  callback  The callback to execute on a valid evaluation
 * @return     {Object}  An object for making chained calls
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
 * @param      {Object}  thisObj  The 'this' object, which is the shapeOf function
 * @param      {Object}  options  The accumulated options from the shapeOf chain calls
 * @param      {Function}  callback  The callback to execute after a valid evaluation, or an invalid evaluation without a .throwsOnInvalid toggle
 * @return     {Object}  An object for making chained calls
 */
let _onComplete = (thisObj, options, callback) => {
	let callbacks = options.onComplete || [];
	callbacks.push(callback);
	return _buildActions(thisObj, options.obj, {onComplete: callbacks, ...options});
};

/**
 * Called whenever shapeOf().shouldBe is called.
 *
 * @param      {Object}  options  The accumulated options from the shapeOf chain calls
 * @param      {Object}   schema   The schema supplied by the .shouldBe() call
 * @return     {boolean}  True if object in question follows provided schema
 */
let _shouldBe = (options, schema) => {
	let obj = options.obj;
	let returnsObject = options.returnsObject || false;
	let rtn;
	let result = false;

	// Evaluate object.
	if (typeof schema === 'function' || (schema._validator && typeof schema._callback === 'function' && schema._callChain)) {
		if (!schema._validator) {
			// Function isn't wrapped as a validator; make a direct call to the function.
			rtn = schema(obj);
		} else {
			// Validator-wrapper function.
			rtn = _executeValidator(schema, obj);
		}
	} else if (Array.isArray(schema)) {
		// Array; expect matching lengths and elements
		let arrayResult = schema.length === obj.length;
		for (let i = 0; i < obj.length; i++) {
			if (!arrayResult)
				break;
			let elemResult = _shouldBe({...options, obj: obj[i], returnsObject: true}, schema[i]);
			arrayResult = arrayResult && typeof elemResult !== 'undefined';
			if (elemResult !== obj[i] && arrayResult) {
				// Value has mutated; change within array
				obj[i] = elemResult;
			}
		}
		if (arrayResult)
			rtn = obj;
	} else if (typeof schema === 'object') {
		rtn = _object(obj, schema, options);
	} else {
		if (schema === obj)
			rtn = obj;
	}

	// Prepare to return results and execute callbacks.
	result = typeof rtn !== 'undefined';

	if (options.onInvalid && !result) {
		options.onInvalid.forEach(callback => callback(obj, schema));
	}
	if (options.onValid && result) {
		options.onValid.forEach(callback => callback(obj, schema));
	}
	if (options.throwOnInvalid && !result) {
		if (options.errorObj)
			throw options.errorObj;
		else
			throw 'Invalid shape detected';
	}
	if (options.onComplete) {
		options.onComplete.forEach(callback => callback(obj, schema));
	}

	if (!returnsObject)
		return result;
	else
		return rtn;
};

/**
 * Handles evaluating an object describing a schema provided with a .shouldBe() call.
 *
 * @param      {Object}   obj     The object in question
 * @param      {Object}   schema  The schema described as an object
 * @param      {Object}   options  The accumulated options from the shapeOf chain calls
 * @return     {boolean}  True if object matches schema
 */
let _object = (obj, schema, options) => {
	if (typeof obj !== 'object' || obj === null)
		return;

	let returnsObject = options.returnsObject || false;
	let exact = options.exact || false;

	options = {...options, returnsObject: true};

	// Run through schema and ensure that 1) all required fields are present and 2) are valid
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
		let rtn = _shouldBe({...options, obj: valInQuestion}, expected);
		if (typeof rtn === 'undefined')
			return;
		if (rtn !== obj[schemaKey]) {
			// Value has mutated; change within object
			obj[schemaKey] = rtn;
		}
	}

	if (exact) {
		// Exact schema - ensure no extraneous fields are present
		let objKeys = Object.keys(obj);
		for (let i = objKeys.length - 1; i >= 0; i--) {
			if (schemaKeys.indexOf(objKeys[i]) === -1)
				return;
		}
	}

	if (!returnsObject)
		return true;
	else
		return obj;
};

/**
 * Base function that attaches arguments to itself when executed.
 * Expected to be bound to a validator.
 *
 * @param      {Array}   args    The arguments
 * @return     {Object}  Validator
 */
let _validatorArgHandler = function(...args) {
	if (args.length < this._requiredArgsCount)
		throw `Validator '${this._name}' requires at least ${this._requiredArgsCount} arguments`;

	// Generate a new set of arguments on the call chain
	this._thisCall.args = args;

	// (Re)attach sub-validators to 'this' object.
	let subKeys = Object.keys(this._subValidators);
	for (let i = subKeys.length - 1; i >= 0; i--) {
		let key = subKeys[i];
		this[key] = this._subValidators[key];
	}

	// Copy over bindings to public-facing.
	let rtn = _validatorArgHandler.bind(this);
	let extKeys = Object.keys(this);
	for (let i = extKeys.length - 1; i >= 0; i--) {
		let key = extKeys[i];
		rtn[key] = this[key];
	}

	return rtn;
};

/**
 * Validator factory. This has the following responsibilities:
 * 
 * - This serves as a wrapper to the core validator function
 * - Retains the state of the validator chain by storing ordered validator calls/arguments.
 *
 * @class      Validator Validator wrapper
 * @param      {Function}  callback  The core validator callback
 * @param      {Object}    options   The options
 */
shapeOf.Validator = function(name, callback, options) {
	options = options || {};

	let validatorOptions = _makeValidatorProperties(name, callback, options);

	// Create a binding.
	let validator = _validatorArgHandler.bind(validatorOptions);

	// Duplicate bound options to the object iself to make them externally accessible as well.
	validator = Object.assign(validator, validatorOptions);

	// Attach to parent validator (if present).
	if (options.parent) {
		_attachSubValidator(options.parent, validator);
	}

	// Store validators.
	validatorOptions._aliases.forEach(alias => {
		shapeOf.Validator._validators[alias] = validator;
	});
	shapeOf.Validator._validators[validatorOptions._name] = validator;

	return validator;
};

/**
 * Generates a call signature for an individual validator.
 *
 * @param      {string}    validatorName  The validator name
 * @param      {Array}     argsList       The arguments list
 * @param      {Function}  callback       The callback to execute
 * @return     {Object}  The call signature object
 */
let _generateValidatorCallSignature = (validatorName, argsList, callback) => {
	return {
		name: validatorName,
		args: argsList,
		_callback: callback
	};
};

/**
 * Generates options for a given validator.
 *
 * @param      {string}    name             The name of the validator
 * @param      {Function}  callback         The callback
 * @param      {Object}    options          New options to swap for current
 * @param      {Object}    existingOptions  The existing options
 * @return     {Object}    A set of new validator options
 */
let _makeValidatorProperties = (name, callback, options, existingOptions) => {
	existingOptions = existingOptions || {};
	options = options || {};
	options = {...existingOptions, ...options};
	let rtn = {};

	rtn._name = name;
	rtn._thisCall = _generateValidatorCallSignature(name, [], callback);
	rtn._callChain = [rtn._thisCall];               // An ordered list of validator calls
	rtn._options = options;
	rtn._validator = true;
	rtn._optional = options.optional || false;
	rtn._requiredArgsCount = options.requiredArgsCount || Math.max(0, callback.length - 1);
	rtn._callback = callback;
	rtn._aliases = options.aliases || [];
	rtn._subValidators = {};

	if (options.serialize)
		rtn._serialize = options.serialize;

	if (options.deserialize)
		rtn._deserialize = options.deserialize;

	if (typeof rtn._aliases === 'string')
		rtn._aliases = [rtn._aliases];

	return rtn;
};

/**
 * Attaches a sub-validator to a given parent.
 *
 * @param      {Object}  parent  The parent
 * @param      {Object}  child   The child
 */
let _attachSubValidator = (parent, child) => {
	// Convert parents if needed.
	if (typeof parent === 'string') {
		parent = shapeOf.Validator._validators[parent];

		if (!parent)
			throw 'Unknown validator: ' + parent;
	}

	let names = [child._name].concat(child._aliases);

	names.forEach(name => {
		// Curate name as needed.
		let childName = name;
		childName = childName.replace(parent._name, '');
		childName = childName.split('.');
		childName = childName[childName.length - 1];

		// Copy over sub-validator attributes to bound validator.
		let subValidatorOptions = {};
		let validatorKeys = Object.keys(child);
		for (let j = validatorKeys.length - 1; j >= 0; j--) {
			let valKey = validatorKeys[j];
			subValidatorOptions[valKey] = child[valKey];
		}

		// Toggle to optional if parent is optional.
		if (parent._optional) {
			subValidatorOptions._optional = true;
		}

		// Adjust the call chain on the cloned sub-validator.
		let newCallChain = [].concat(parent._callChain).concat(child._callChain);
		subValidatorOptions._callChain = newCallChain;

		// Bind a new sub-validator.
		let subValidator = _validatorArgHandler.bind(subValidatorOptions);
		subValidator = Object.assign(subValidator, subValidatorOptions);

		// Attach to parent validator.
		parent[childName] = subValidator;
		parent._subValidators[childName] = subValidator;
	});

};

/**
 * Executes a validator based on a call chain.
 *
 * @param      {Object}  validator  The validator call chain object
 * @param      {Object}  obj        The object in question
 * @return     {Object}             Object resulting from validation
 */
let _executeValidator = (validator, obj) => {
	// Run through call chain.
	let callChain = validator._callChain;
	for (let i = 0; i < callChain.length; i++) {
		let link = callChain[i];
		if (link.args.length < link._requiredArgsCount)
			throw 'Missing required arguments for validator: ' + link._name;
		// console.log('Executing validator ' + link.name + ' with args: ' + link.args, link.args.length);
		let args = link.args.concat([obj]);
		obj = link._callback(...args);
		if (typeof obj === 'undefined')
			break;
	}
	return obj;
};

/**
 * A key-value set of validator names to validator objects.
 */
shapeOf.Validator._validators = {};

shapeOf.Validator._serialize = (validator) => {
	// Create core descriptor
	let rtn = {
		"type": "validator",
		"validatorName": validator._name,
	};

	// Build parameter values
	let params = [];
	let args = validator._args;
	if (args && args.length > 0) {
		for (let i = 0; i < args.length; i++) {
			params.push(shapeOf.Validator._serializeArg(args[i]));
		}
		rtn.params = params;
	}

	// If an extended serializer function is found, execute it
	if (validator._serialize) {
		rtn = {
			...rtn,
			...validator._serialize()
		};
	}

	return rtn;

};

shapeOf.Validator._serializeArg = (arg) => {
	let rtn = {
		'type': 'primitive',
	};
	if (arg.serialize && typeof arg.serialize === 'function') {
		rtn = {
			...rtn,
			...arg.serialize()
		};
	} else if (Array.isArray(arg)) {
		let val = rtn.value = [];
		for (let i = 0; i < arg.length; i++) {
			val.push(shapeOf.Validator._serializeArg(arg[i]));
		}
	} else {
		rtn.value = arg;
	}

	return rtn;
};



/*
 * Validator Functions
 */



/**
 * Validator for number types.
 *
 * @param      {Object}  obj     The object in question
 * @return     {Object}  Returns the object if valid, undefined otherwise
 */
let _shapeOf_number = (obj) => {
	if (typeof obj === 'number')
		return obj;
};

/**
 * Validator for number types within a specific range.
 *
 * @param      {number}  min     The lower acceptable range for the number
 * @param      {number}  max     The upper acceptable range for the number
 * @return     {Function}  Returns a validator function specific to the number range
 */
let _shapeOf_number_range = (min, max, obj) => {
	let nmin = Math.min(min, max);
	let nmax = Math.max(min, max);
	if (obj <= nmax && obj >= nmin)
		return obj;
};

/**
 * Validator function using the >= operator.
 *
 * @param      {number}    min     The minimum
 * @param      {number}    obj     The object in question
 * @return     {Object}  Returns the object if valid, undefined otherwise
 */
let _shapeOf_greaterThanOrEqualTo = (min, obj) => {
	if (obj >= min)
		return obj;
};

/**
 * Validator function using the <= operator.
 *
 * @param      {number}    max     The maximum
 * @param      {number}    obj     The object in question
 * @return     {Object}  Returns the object if valid, undefined otherwise
 */
let _shapeOf_lessThanOrEqualTo = (max, obj) => {
	if (obj <= max)
		return obj;
};

/**
 * Validator for integer types.
 *
 * @param      {Object}  obj     The object in question
 * @return     {Object}  Returns the object if valid, undefined otherwise
 */
let _shapeOf_integer = (obj) => {
	if (_isInteger(obj)) {
		return obj;
	}
};

/**
 * Validator for string types.
 *
 * @param      {Object}  obj     The object in question
 * @return     {Object}  Returns the object if valid, undefined otherwise
 */
let _shapeOf_string = (obj) => {
	if (typeof obj === 'string')
		return obj;
};

/**
 * Validator for string types matching a given pattern. Accepts either two or three arguments.
 * 
 * If two arguments are provided, the first is assumed as a RegExp/string pattern and
 * the second as the object in question.
 * 
 * If three arguments are provided, the first is assumed as a RegExp/string pattern,
 * the second is assumed as regex flags, and the third the object in question.
 *
 * @param      {Array}   args    The arguments
 * @return     {Object}  Returns the object if valid, undefined otherwise
 */
let _shapeOf_string_pattern = (...args) => {
	let flags = '';
	let pattern = '';
	let obj;
	if (args.length < 2 || args.length > 3) {
		throw 'String pattern validator requires between one and two arguments';
	}
	pattern = args[0];
	if (args.length === 2) {
		obj = args[1];
	} else {
		flags = args[1];
		obj = args[2];
	}
	if (typeof pattern === 'string') {
		pattern = new RegExp(pattern, flags);
	} else if (pattern instanceof RegExp) {
		if (args.length === 3)
			pattern = new RegExp(pattern, flags);
	} else {
		throw 'shapeOf.string.pattern() only accepts strings and RegExp objects as an argument';
	}
	if (pattern.test(obj))
		return obj;
};

/**
 * Validator for length. Accepts either two or three arguments.
 * 
 * If two arguments are provided, the first is assumed as an exact length and
 * the second as the object in question.
 * 
 * If three arguments are provided, the first is assumed as an inclusive minimum,
 * the second is an inclusive maximum, and the third the object in question.
 *
 * @param      {Array}   args    The arguments
 * @return     {Object}  Returns the object if valid, undefined otherwise
 */
let _shapeOf_length = (...args) => {
	if (args.length < 2 || args.length > 3) {
		throw 'Length validator requires between one and two arguments';
	}
	let obj = args[args.length - 1];
	if (args.length === 2) {
		// Exact length
		if (obj.length === args[0])
			return obj;
	} else {
		// Range length
		let min = Math.min(args[0], args[1]);
		let max = Math.max(args[0], args[1]);
		if (obj.length >= min && obj.length <= max)
			return obj;
	}
};

/**
 * Validator for array types.
 *
 * @param      {Object}  obj     The object in question
 * @return     {Object}  Returns the object if valid, undefined otherwise
 */
let _shapeOf_array = (obj) => {
	if (Array.isArray(obj))
		return obj;
};

/**
 * Validator for boolean types.
 *
 * @param      {Object}  obj     The object in question
 * @return     {Object}  Returns the object if valid, undefined otherwise
 */
let _shapeOf_bool = (obj) => {
	if (typeof obj === 'boolean')
		return obj;
};

/**
 * Validator for object types. Null isn't considered an object and instead passes with shapeOf.null.
 *
 * @param      {Object}  obj     The object in question
 * @return     {Object}  Returns the object if valid, undefined otherwise
 */
let _shapeOf_object = (obj) => {
	if (typeof obj === 'object' && obj !== null)
		return obj;
};

/**
 * Validator for null types. Undefined isn't considered null.
 *
 * @param      {Object}  obj     The object in question
 * @return     {Object}  Returns the object if valid, undefined otherwise
 */
let _shapeOf_null = (obj) => {
	if (obj === null)
		return obj;
};

/**
 * Validator for primitive types, which can be string, boolean, number, or null.
 *
 * @param      {Object}  obj     The object in question
 * @return     {Object}  Returns the object if valid, undefined otherwise
 */
let _shapeOf_primitive = (obj) => {
	return _shapeOf_string(obj) || _shapeOf_bool(obj) || _shapeOf_number(obj) || _shapeOf_null(obj);
};

/**
 * Validator for arrays of one or more types. Can accept variadic arguments, or a single array containing validators.
 * 
 *   shapeOf.arrayOf(shapeOf.string, shapeOf.number);
 *   shapeOf.arrayOf([shapeOf.string, shapeOf.number]);
 *
 * @param      {Array}   args    The arguments
 * @return     {Object}  Returns the object if valid, undefined otherwise
 */
let _shapeOf_arrayOf = (...args) => {
	if (args.length < 2) {
		throw 'arrayOf validator requires at least one argument';
	}
	let obj = args.pop();
	let types = _flattenArgs(args);
	let validShape;
	if (!Array.isArray(obj))
		return;
	for (let j = obj.length - 1; j >= 0; j--) {
		validShape = false;
		for (let i = types.length - 1; i >= 0; i--) {
			let result = shapeOf(obj[j]).returnsObject.shouldBe(types[i]);
			validShape = validShape || typeof result !== 'undefined';
			if (validShape) {
				if (result !== obj[j]) {
					// Value changed; apply mutation
					obj[j] = result;
				}
				break;
			}
		}
		if (!validShape)
			break;
	}
	if (validShape)
		return obj;
};

/**
 * Validator for objects whose values are of one or more types. Can accept variadic
 * arguments, or a single array containing validators.
 * 
 *   shapeOf.objectOf(shapeOf.string, shapeOf.number);
 *   shapeOf.objectOf([shapeOf.string, shapeOf.number]);
 *
 * @param      {Array}   args    The arguments
 * @return     {Object}  Returns the object if valid, undefined otherwise
 */
let _shapeOf_objectOf = (...args) => {
	if (args.length < 2) {
		throw 'objectOf validator requires at least one argument';
	}
	let obj = args.pop();
	let types = _flattenArgs(args);
	let validShape;
	if (typeof obj !== 'object' || obj === null)
		return;
	let objKeys = Object.keys(obj);
	for (let j = objKeys.length - 1; j >= 0; j--) {
		let val = obj[objKeys[j]];
		validShape = false;
		for (let i = types.length - 1; i >= 0; i--) {
			let result = shapeOf(val).returnsObject.shouldBe(types[i]);
			validShape = validShape || typeof result !== 'undefined';
			if (validShape) {
				if (result !== val) {
					// Value changed; apply mutation
					obj[objKeys[j]] = result
				}
				break;
			}
		}
		if (!validShape)
			break;
	}
	if (validShape)
		return obj;
};

/**
 * Validator for an object that must strictly equal an object within the list.
 * 
 *   shapeOf.oneOf('foo', 'bar');
 *   shapeOf.oneOf(['foo', 'bar']);
 *
 * @param      {Array}   args    The arguments
 * @return     {Object}  Returns the object if valid, undefined otherwise
 */
let _shapeOf_oneOf = (...args) => {
	if (args.length < 2) {
		throw 'oneOf validator requires at least one argument';
	}
	let obj = args.pop();
	let list = _flattenArgs(args);
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
 * @param      {Array}   args    The arguments
 * @return     {Object}  Returns the object if valid, undefined otherwise
 */
let _shapeOf_oneOfType = (...args) => {
	if (args.length < 2) {
		throw 'oneOfType validator requires at least one argument';
	}
	let obj = args.pop();
	let list = _flattenArgs(args);
	for (let i = list.length - 1; i >= 0; i--) {
		if (shapeOf(obj).shouldBe(list[i]))
			return obj;
	}
};

/**
 * A list of core validators. Each validator described within this list also has
 * optional equivalents generated for it.
 *
 * @type       {Array}
 */
let _coreValidators = [
	{
		name:     'shapeOf.number',
		callback: _shapeOf_number
	},
	{
		name:     'shapeOf.number.range',
		callback: _shapeOf_number_range,
		options: {
			parent: 'shapeOf.number'
		}
	},
	{
		name:     'shapeOf.number.min',
		callback: _shapeOf_greaterThanOrEqualTo,
		options: {
			parent: 'shapeOf.number',
			aliases: 'shapeOf.number.greaterThanOrEqualTo'
		}
	},
	{
		name:     'shapeOf.number.max',
		callback: _shapeOf_lessThanOrEqualTo,
		options: {
			parent: 'shapeOf.number',
			aliases: 'shapeOf.number.lessThanOrEqualTo'
		}
	},
	{
		name:     'shapeOf.integer',
		callback: _shapeOf_integer
	},
	{
		name:     'shapeOf.integer.range',
		callback: _shapeOf_number_range,
		options: {
			parent: 'shapeOf.integer'
		}
	},
	{
		name:     'shapeOf.integer.min',
		callback: _shapeOf_greaterThanOrEqualTo,
		options: {
			parent: 'shapeOf.integer',
			aliases: 'shapeOf.integer.greaterThanOrEqualTo'
		}
	},
	{
		name:     'shapeOf.integer.max',
		callback: _shapeOf_lessThanOrEqualTo,
		options: {
			parent: 'shapeOf.integer',
			aliases: 'shapeOf.integer.lessThanOrEqualTo'
		}
	},
	{
		name:     'shapeOf.string',
		callback: _shapeOf_string
	},
	{
		name:     'shapeOf.string.size',
		callback: _shapeOf_length,
		options: {
			parent: 'shapeOf.string',
			aliases: 'shapeOf.string.ofSize'
		}
	},
	{
		name:     'shapeOf.string.pattern',
		callback: _shapeOf_string_pattern,
		options: {
			parent: 'shapeOf.string'
		}
	},
	{
		name:     'shapeOf.array',
		callback: _shapeOf_array
	},
	{
		name:     'shapeOf.array.size',
		callback: _shapeOf_length,
		options: {
			parent: 'shapeOf.array',
			aliases: 'shapeOf.array.ofSize'
		}
	},
	{
		name:     'shapeOf.bool',
		callback: _shapeOf_bool,
		options: {
			aliases: 'shapeOf.boolean'
		}
	},
	{
		name:     'shapeOf.object',
		callback: _shapeOf_object
	},
	{
		name:     'shapeOf.null',
		callback: _shapeOf_null
	},
	{
		name:     'shapeOf.primitive',
		callback: _shapeOf_primitive
	},
	{
		name:     'shapeOf.arrayOf',
		callback: _shapeOf_arrayOf
	},
	{
		name:     'shapeOf.arrayOf.size',
		callback: _shapeOf_length,
		options: {
			parent: 'shapeOf.arrayOf',
			aliases: 'shapeOf.arrayOf.ofSize'
		}
	},
	{
		name:     'shapeOf.objectOf',
		callback: _shapeOf_objectOf
	},
	{
		name:     'shapeOf.oneOf',
		callback: _shapeOf_oneOf
	},
	{
		name:     'shapeOf.oneOfType',
		callback: _shapeOf_oneOfType
	},
];

// Generate validators, including optionals.
shapeOf.optional = {};
_coreValidators.forEach(validator => {
	// Create core validator.
	let newValidator = shapeOf.Validator(
		validator.name,
		validator.callback,
		validator.options
	);
	let options = validator.options || {};
	let names = validator.name.split('.');
	let parentNames = (options.parent || '').split('.');

	// Create optional version of core validator.
	let optOptions = {...validator.options, optional: true};
	let optName = names[0] + '.optional.' + (names.filter((s,i) => i > 0)).join('.');
	if (optOptions.parent) {
		let optParentName = parentNames[0] + '.optional.' + (parentNames.filter((s,i) => i > 0)).join('.');
		optOptions.parent = optParentName;
	}
	let optValidator = shapeOf.Validator(
		optName,
		validator.callback,
		optOptions
	);

	// Is this a top-level validator? Attach to shapeOf object.
	if (names[0] === 'shapeOf' && names.length === 2) {
		shapeOf[names[1]] = newValidator;
		shapeOf.optional[names[1]] = optValidator;
	}

	// Are there top-level aliases to this validator? Attach to shapeOf object.
	let aliases = options.aliases || '';
	if (typeof aliases === 'string')
		aliases = [aliases];
	aliases.forEach(alias => {
		let s = alias.split('.');
		if (s[0] === 'shapeOf' && s.length === 2) {
			shapeOf[s[1]] = newValidator;
			shapeOf.optional[s[1]] = optValidator;
		}
	});
});

})();

// NOTE: The following lines are automatically updated when running 'npm run-script update-version'
shapeOf.version = "0.0.5"; // core version
shapeOf.compatibleSchemaVersion = "0.0.5"; // compatible schema version

module.exports = shapeOf;