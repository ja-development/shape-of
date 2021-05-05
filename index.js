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
 * Determines if the current version of something is equal to or greater than the compatible version.
 *
 * @param      {String}  currentVer     The current version
 * @param      {String}  compatibleVer  The compatible version
 * @return     {boolean}  True if compatibile version, False otherwise.
 */
let _isCompatibileVersion = (currentVer, compatibleVer) => {
	currentVer = currentVer.split('.');
	compatibleVer = compatibleVer.split('.');
	if (currentVer.length !== 3 || compatibleVer.length !== 3)
		throw 'Bad version format';
	currentVer[0] = parseInt(currentVer[0]);
	currentVer[1] = parseInt(currentVer[1]);
	currentVer[2] = parseInt(currentVer[2]);
	compatibleVer[0] = parseInt(compatibleVer[0]);
	compatibleVer[1] = parseInt(compatibleVer[1]);
	compatibleVer[2] = parseInt(compatibleVer[2]);
	return currentVer[0] >= compatibleVer[0] && 
	       (currentVer[1] >= compatibleVer[1] || currentVer[0] > compatibleVer[0]) &&
	       (currentVer[2] >= compatibleVer[2] || currentVer[1] > compatibleVer[1]);
};

/**
 * Create an object that returns after using one of the following:
 * 
 *  - returnsObject
 *  - returnsResults
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
	let rtn = {};

	if (options.baseObject) {
		rtn = options.baseObject;
		delete options.baseObject;
	}

	// Refresh excluded options
	delete options.exclude;
	_buildExclusions(options);
	let exclude = options.exclude;

	if (exclude.indexOf('shouldBe') === -1)
		rtn.shouldBe = rtn.is = _shouldBe.bind(thisObj, { obj, ...options });

	if (exclude.indexOf('shouldBeExactly') === -1)
		rtn.shouldBeExactly = rtn.isExactly = _shouldBe.bind(thisObj, { obj, exact: true, ...options });

	if (exclude.indexOf('returnsObject') === -1)
		rtn.returnsObject = _returnsObject(thisObj, { obj, ...options });

	if (exclude.indexOf('returnsResults') === -1)
		rtn.returnsResults = _returnsResults(thisObj, { obj, ...options });

	if (exclude.indexOf('shouldNotBe') === -1)
		rtn.shouldNotBe = rtn.isNot = ((obj, schema) => !_shouldBe(obj, schema)).bind(thisObj, { obj, ...options });

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
 * Builds an array of actions to exclude from the next successive chain call
 * after shapeOf(obj) or any action thereafter.
 *
 * @param      {Object}  options   The options built throughout the chain
 * @param      {Array}   excludes  Additional excluded actions
 */
let _buildExclusions = (options, ...excludes) => {
	options.exclude = options.exclude || [];
	if (options.returnsObject || options.returnsResults) {
		excludes = excludes.concat(['returnsObject']);
		excludes = excludes.concat(['returnsResults']);
	}
	if (options.throwsOnInvalid) {
		excludes = excludes.concat(['throwsOnInvalid']);
	}
	excludes.forEach(exclude => {
		if (options.exclude.indexOf(exclude) === -1)
			options.exclude.push(exclude);
	});
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
		throwsOnInvalid: true,
		...options
	};
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
 * @return     {Object}  An object for making chained calls
 */
let _returnsObject = (thisObj, options) => {
	let extOptions = {
		obj: options.obj,
		returnsObject: true,
		...options
	};
	return _buildActions(thisObj, options.obj, extOptions);
};

/**
 * Builds the actions of a shapeOf().returnsResults call.
 *
 * @param      {Object}  thisObj  The 'this' object, which is the shapeOf function
 * @param      {Object}  options  The accumulated options from the shapeOf chain calls
 * @return     {Object}  An object for making chained calls
 */
let _returnsResults = (thisObj, options) => {
	let extOptions = {
		obj: options.obj,
		returnsResults: true,
		...options
	};
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
 * @param      {Object}   options  The accumulated options from the shapeOf chain calls
 * @param      {Object}   schema   The schema supplied by the .shouldBe() call
 * @return     {boolean}  True if object in question follows provided schema
 */
let _shouldBe = (options, schema) => {
	let obj = options.obj;
	let returnsObject = options.returnsObject || false;
	let returnsResults = options.returnsResults || false;
	let rtn;

	let result = false;
	let log = options.log || [];

	options = {log, ...options};

	// Add to shouldBe()/shouldBeExactly() options chain
	if (!shapeOf._shouldBeOptionsChain) {
		shapeOf._shouldBeOptionsChain = [];
	}
	shapeOf._lastShouldBeOptions = options;
	shapeOf._shouldBeOptionsChain.push(options);

	// Evaluate object.
	if (shapeOf.isValidator(schema)) {
		rtn = _executeValidator(schema, obj);
		if (typeof rtn === 'undefined') {
			_validationLog(options, `Failed: Validator '${schema._name}'`, obj);
		} else {
			if (obj !== rtn) {
				// Value has mutated
				_validationLog(options, `Mutation: Validator '${schema._name}'`, obj, rtn);
			}
		}
	} else if (typeof schema === 'function') {
		// Function isn't wrapped as a validator; make a direct call to the function.
		rtn = schema(obj);
		if (typeof rtn === 'undefined') {
			_validationLog(options, `Failed: Validation using functional validator '${schema.name}'`, obj);
		} else {
			if (obj !== rtn) {
				// Value has mutated
				_validationLog(options, `Mutation: Functional validator '${schema.name}'`, obj, rtn);
			}
		}
	} else if (Array.isArray(schema)) {
		// Array; expect matching lengths and elements
		let arrayResult = schema.length === obj.length;
		for (let i = 0; i < obj.length; i++) {
			if (!arrayResult)
				break;
			let elemResult = _shouldBe({...options, obj: obj[i], returnsObject: true}, schema[i]);
			arrayResult = arrayResult && typeof elemResult !== 'undefined';
			if (!arrayResult) {
				_validationLog(options, `Failed: Array element at index ${i}`, obj[i]);
			}
			if (elemResult !== obj[i] && arrayResult) {
				// Value has mutated; change within array
				_validationLog(options, `Mutation: Array element at index ${i}`, obj[i], elemResult);
				obj[i] = elemResult;
			}
		}
		if (arrayResult) {
			rtn = obj;
		} else {
			_validationLog(options, "Failed: Array", obj);
		}
	} else if (typeof schema === 'object') {
		rtn = _object(obj, schema, options);
		if (typeof rtn === 'undefined')
			_validationLog(options, "Failed: Object", obj);
	} else {
		if (schema === obj)
			rtn = obj;
		else
			_validationLog(options, "Failed: Strict equality", obj, rtn);
	}

	// Prepare to return results and execute callbacks.
	result = typeof rtn !== 'undefined';

	if (options.onInvalid && !result) {
		options.onInvalid.forEach(callback => callback(obj, schema));
	}
	if (options.onValid && result) {
		options.onValid.forEach(callback => callback(obj, schema));
	}
	if (options.throwsOnInvalid && !result) {
		if (options.errorObj)
			throw options.errorObj;
		else
			throw 'Invalid shape detected';
	}
	if (options.onComplete) {
		options.onComplete.forEach(callback => callback(obj, schema));
	}

	// Update the shouldBe()/shouldBeExactly() options chain
	shapeOf._lastShouldBeOptions = shapeOf._shouldBeOptionsChain.pop();

	// Return based on options
	if (returnsObject) {
		return rtn;
	} else if (returnsResults) {
		return {
			success: result,
			log: log,
			obj: obj,
		};
	} else {
		return result;
	}
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
			if (!expected._optional){
				_validationLog(options, `Failed: Object with missing key '${schemaKey}'`);
				return;
			} else {
				continue;
			}
		}
		let valInQuestion = obj[schemaKey];
		let rtn = _shouldBe({...options, obj: valInQuestion}, expected);
		if (typeof rtn === 'undefined') {
			_validationLog(options, `Failed: Object at key '${schemaKey}'`, valInQuestion);
			return;
		}
		if (rtn !== obj[schemaKey]) {
			// Value has mutated; change within object
			_validationLog(options, `Mutation: Object field '${schemaKey}'`, obj[schemaKey], rtn);
			obj[schemaKey] = rtn;
		}
	}

	if (exact) {
		// Exact schema - ensure no extraneous fields are present
		let objKeys = Object.keys(obj);
		for (let i = objKeys.length - 1; i >= 0; i--) {
			if (schemaKeys.indexOf(objKeys[i]) === -1) {
				_validationLog(options, `Failed: Object with extraneous key '${objKeys[i]}'`);
				return;
			}
		}
	}

	if (!returnsObject)
		return true;
	else
		return obj;
};

/**
 * Records a log during validation process.
 * 
 * If the shouldBeOptions are omitted and only a message is included, the last call to
 * shouldBe's options are used.
 *
 * @param      {string|Object}  shouldBeOptions  The options object created in _shouldBe(), or a message
 * @param      {string}  message          The message
 * @param      {Object}  obj              Extra objects/data to attach
 */
let _validationLog = (shouldBeOptions, message, ...obj) => {
	if (!shouldBeOptions) {
		shouldBeOptions = shapeOf._lastShouldBeOptions;
	} else if (typeof shouldBeOptions === 'string') {
		if (typeof message !== 'undefined') {
			obj.push(message);
		}
		message = shouldBeOptions;
		shouldBeOptions = shapeOf._lastShouldBeOptions;
	}

	if (!shouldBeOptions.returnsResults)
		return;

	let log = shouldBeOptions.log;
	let rtn = { message };

	if (obj.length > 0) {
		if (obj.length === 1)
			obj = obj[0];
		rtn.obj = obj;
	}

	log.push(rtn);
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

	// Copy bindings from original validator.
	let bindings = { ...this };

	bindings._callChain = [].concat(this._callChain);
	bindings._callChain.pop();  // remove old _thisCall with empty arguments

	// Generate a new set of arguments on the call chain
	bindings._thisCall = _generateValidatorCallSignature(this._thisCall);
	bindings._thisCall.args = [].concat(args);
	bindings._callChain.push(bindings._thisCall);  // add updated _thisCall to _callChain

	// (Re)attach sub-validators to 'this' object.
	let subKeys = Object.keys(bindings._subValidators);
	for (let i = subKeys.length - 1; i >= 0; i--) {
		let key = subKeys[i];
		let subValidator = bindings._subValidators[key];
		let subValidatorProps = _makeValidatorProperties(
			subValidator._name,
			subValidator._callback,
			{
				...subValidator._options,
				_callChain: bindings._callChain
			}
		);
		let newSubValidator = _validatorArgHandler.bind(subValidatorProps);
		let extKeys = Object.keys(subValidatorProps);
		for (let i = extKeys.length - 1; i >= 0; i--) {
			let subKey = extKeys[i];
			newSubValidator[subKey] = bindings[subKey];
		}

		bindings[key] = newSubValidator;
	}

	// Copy over bindings to public-facing.
	let rtn = _validatorArgHandler.bind(bindings);
	let extKeys = Object.keys(bindings);
	for (let i = extKeys.length - 1; i >= 0; i--) {
		let key = extKeys[i];
		rtn[key] = bindings[key];
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
 * A key-value set of validator names to validator objects.
 */
shapeOf.Validator._validators = {};

/**
 * A token shared by validators to verify as validators since they aren't
 * sub-classes of shapeOf.Validator.
 *
 * @type       {Object}
 */
let _validatorToken = {validator: 'token'};

/**
 * Determines whether the specified object is a validator.
 *
 * @param      {Object}   obj     The object
 * @return     {boolean}  True if the specified object is a validator, False otherwise.
 */
shapeOf.isValidator = (obj) => {
	return Boolean(
		   obj &&
		   obj._validatorToken &&
		   obj._validatorToken === _validatorToken &&
		   obj._callback &&
	       typeof obj._callback === 'function' &&
	       obj._callChain &&
	       obj._thisCall
	);
};

/**
 * Generates a call signature for an individual validator.
 * 
 * If validatorName is set to a previous call signature object, a duplicate of the 
 * link is generated.
 *
 * @param      {string|Object}  validatorName  The validator name or previous call signature object
 * @param      {Array}     argsList       The arguments list
 * @param      {Function}  callback       The callback to execute
 * @return     {Object}  The call signature object
 */
let _generateValidatorCallSignature = (validatorName, argsList, callback) => {
	if (typeof validatorName === 'object') {
		return {
			name: validatorName.name,
			args: [].concat(validatorName.args),
			_callback: validatorName._callback
		}
	} else {
		return {
			name: validatorName,
			args: argsList,
			_callback: callback
		};
	}
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

	let callChain = [].concat(options._callChain || []);
	let thisCall = _generateValidatorCallSignature(name, [], callback)
	callChain.push(thisCall);

	rtn._name = name;
	rtn._thisCall = thisCall;
	rtn._callChain = callChain;               // An ordered list of validator calls
	rtn._options = options;
	rtn._optional = options.optional || false;
	rtn._requiredArgsCount = options.requiredArgsCount || Math.max(0, callback.length - 1);
	rtn._callback = callback;
	rtn._aliases = options.aliases || [];
	rtn._subValidators = {};
	rtn._validatorToken = _validatorToken;
	// rtn.toJSON = _serializeValidator.bind(null, rtn);

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
		let args = link.args.concat([obj]);
		obj = link._callback(...args);
		if (typeof obj === 'undefined')
			break;
	}
	return obj;
};

/**
 * Serializes a schema and returns as a JSON-encoded string or an object equivalent.
 * 
 * Options include:
 * - returnsObject
 *
 * @param      {Object}  schema         The schema
 * @param      {Object}  options        Options to use when serializing
 * @return     {Object|String}  JSON-encoded string of schema or object equivalent
 */
shapeOf.serialize = (schema, options) => {
	let rtn = {
		'_shapeOfVersion': shapeOf.version,
		'_shapeOfSchemaVersion': shapeOf.compatibleSchemaVersion,
		'schema': _serialize(schema)
	};

	options = options || {};

	if (!options.returnsObject)
		return JSON.stringify(rtn);
	else
		return rtn;
};

/**
 * Deserializes a schema and returns the schema object.
 *
 * @param      {String|Object}  serializedSchema  The serialized schema
 * @return     {Object}   Schema object
 */
shapeOf.deserialize = (serializedSchema) => {
	if (typeof serializedSchema === 'string') {
		try {
			serializedSchema = JSON.parse(serializedSchema);
		} catch (e) {
			throw "Error while deserializing schema:\n" + e.toString();
		}
	}
	if (!serializedSchema._shapeOfVersion || !serializedSchema._shapeOfSchemaVersion || !serializedSchema.schema) {
		throw "Object doesn't appear to be a valid shapeOf schema.";
	}
	if (!_isCompatibileVersion(shapeOf.compatibleSchemaVersion, serializedSchema._shapeOfSchemaVersion)) {
		throw `Incompatible schema versions, current version == ${shapeOf.compatibleSchemaVersion}, schema version == ${serializedSchema._shapeOfSchemaVersion}`;
	}

	return _deserialize(serializedSchema.schema);
};

/**
 * Deserializes a validator from a serialized schema.
 *
 * @param      {Object}  obj     The serialized validator
 * @return     {Validator}   Validator object
 */
let _deserializeValidator = (obj) => {
	if (!obj.type || obj.type !== 'validator')
		throw "Object isn't a validator type: " + obj.toString();
	if (!obj.callChain || !Array.isArray(obj.callChain) ||
		!obj.name || typeof obj.name !== 'string')
		throw "Malformed validator: " + obj.toString();

	let optional = false;

	if (obj.optional && typeof obj.optional === 'boolean')
		optional = true;

	// Run through the call chain, regenerating validators along the way.
	let rtn;
	obj.callChain.forEach(link => {
		if (!link.name || typeof link.name !== 'string' ||
			!link.args || !Array.isArray(link.args))
			throw "Malformed validator: " + obj.toString();

		let validator = shapeOf.Validator._validators[link.name];
		if (typeof validator === 'undefined')
			throw "Validator not found: " + link.name;

		let simpleName = link.name.split('.').pop();
		
		if (rtn) {
			if (!rtn[simpleName])
				throw "Cannot find sub-validator " + link.name;
		}

		if (link.args.length > 0) {
			// Set arguments for validator by deserializing arguments
			let args  = [];
			link.args.forEach(arg => args.push(_deserialize(arg)));
			if (rtn)
				rtn = rtn[simpleName](...args);
			else
				rtn = validator(...args);
		} else {
			// No arguments for validator needed
			if (rtn)
				rtn = rtn[simpleName];
			else
				rtn = validator;
		}
	});

	return rtn;
};

/**
 * Deserializes a part of a serialized schema.
 *
 * @param      {Object}    obj     The object to deserialize
 * @param      {Object}    parent  Optional. The parent object for 'field' types.
 * @return     {Object}    Deserialized object.
 */
let _deserialize = (obj, parent) => {
	if (!obj.type || typeof obj.type !== 'string')
		throw "Object isn't a valid type: " + obj.toString();
	if (typeof obj.value === 'undefined' && obj.type !== 'validator')
		throw "Object missing value: " + obj.toString();

	let rtn;

	// Objects
	if (obj.type === 'object') {

		if (!Array.isArray(obj.value))
			throw "Type 'object' value must be an array";
		rtn = {};
		obj.value.forEach(field => {
			_deserialize(field, rtn);
		});

	// Object fields
	} else if (obj.type === 'field') {

		if (!obj.name || typeof obj.name !== 'string')
			throw "Illegal/missing field name for object " + parent.toString();
		if (!parent)
			throw "No parent present for 'field' type";
		parent[obj.name] = _deserialize(obj.value);

	// Arrays
	} else if (obj.type === 'array') {

		if (!Array.isArray(obj.value))
			throw "Type 'array' value must be array";
		rtn = [];
		obj.value.forEach(elem => {
			rtn.push(_deserialize(elem));
		});

	// Primitives
	} else if (obj.type === 'primitive') {

		rtn = obj.value;

	// Validators
	} else if (obj.type === 'validator') {

		rtn = _deserializeValidator(obj);

	// Regular expressions
	} else if (obj.type === 'regexp') {

		if (typeof obj.value !== 'string' || typeof obj.flags !== 'string')
			throw 'RegExp object missing required field';

		rtn = new RegExp(obj.value, obj.flags);

	} else {
		throw "Unknown object type: " + obj.type;
	}

	return rtn;
};

/**
 * Creates a serializable version of a validator.
 *
 * @param      {Object}  validator  The validator
 * @return     {Object}  Serializable version of validator.
 */
let _serializeValidator = (validator) => {
	// Create core descriptor
	let rtn = {
		"type": "validator",
		"name": validator._name,
	};

	if (validator._optional)
		rtn.optional = true;

	// Build parameter values
	let callChain = rtn.callChain = [];
	let links = validator._callChain;
	if (links && links.length > 0) {
		for (let i = 0; i < links.length; i++) {
			let link = links[i];
			let args = link.args;
			let sargs = [];
			let slink = {
				'name': link.name,
				'args': sargs
			};
			for (let j = 0; j < args.length; j++) {
				sargs.push(_serialize(args[j]));
			}
			callChain.push(slink);
		}
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

/**
 * Creates a serializable version of an object from a schema.
 *
 * @param      {Array}   obj     The argument
 * @return     {Object}  Serializable version of the object.
 */
let _serialize = (obj) => {
	let rtn = {
		type: 'primitive',
	};
	if (obj.toJSON) {
		rtn = obj;
	} else if (shapeOf.isValidator(obj)) {
		rtn = _serializeValidator(obj);
	} else if (obj.serialize && typeof obj.serialize === 'function') {
		rtn = {
			...rtn,
			...obj.serialize()
		};
	} else if (Array.isArray(obj)) {
		rtn.type = 'array';
		let val = rtn.value = [];
		for (let i = 0; i < obj.length; i++) {
			val.push(_serialize(obj[i]));
		}
	} else if (obj instanceof RegExp) {
		let expr = obj.toString().split('/');
		let flags = expr.pop();
		expr.shift();
		expr = expr.join('/');
		rtn.type = 'regexp';
		rtn.value = expr;
		rtn.flags = flags;
	} else if (typeof obj === 'object' && obj !== null) {
		rtn.type = 'object';
		let keys = Object.keys(obj);
		let fields = rtn.value = [];
		for (let i = 0; i < keys.length; i++) {
			let key = keys[i];
			fields.push({
				type: 'field',
				name: key,
				value: _serialize(obj[key])
			});
		}
	} else {
		rtn.value = obj;
	}

	return rtn;
};
let _serialize_regexExpr = /^\/(.*)\/([a-zA-Z]*)$/g;


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
 * Validator for strings following email syntax.
 *
 * @param      {Object}  obj     The object in question
 * @return     {Object}  Returns the object if valid, undefined otherwise
 */
let _shapeOf_string_email = (obj) => {
	if (_shapeOf_string_email_regex.test(obj))
		return obj;
};
let _shapeOf_string_email_regex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[((25[0-5]|(2[0-4]|1[0-9]|[1-9]|)[0-9])\.){3}(25[0-5]|(2[0-4]|1[0-9]|[1-9]|)[0-9])\])|(([a-zA-Z0-9][a-zA-Z\-0-9]+\.)+(?![wW][eE][bB])[a-zA-Z]{2,}))$/;

/**
 * Validator for strings following IPv4 syntax.
 *
 * @param      {Object}  obj     The object in question
 * @return     {Object}  Returns the object if valid, undefined otherwise
 */
let _shapeOf_string_ipv4 = (obj) => {
	if (_shapeOf_string_ipv4_regex.test(obj))
		return obj;
};
let _shapeOf_string_ipv4_regex = /^((25[0-5]|(2[0-4]|1[0-9]|[1-9]|)[0-9])(\.(?!$)|$)){4}$/;

/**
 * Validator for strings following IPv6 syntax.
 *
 * @param      {Object}  obj     The object in question
 * @return     {Object}  Returns the object if valid, undefined otherwise
 */
let _shapeOf_string_ipv6 = (obj) => {
	if (_shapeOf_string_ipv6_regex.test(obj))
		return obj;
};
let _shapeOf_string_ipv6_o0 = '([0-9A-Fa-f]{1,4}:)';
let _shapeOf_string_ipv6_o1 = '(:[0-9A-Fa-f]{1,4})';
let _shapeOf_string_ipv6_o2 = '(25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)';
let _shapeOf_string_ipv6_regex = '^\\s*(({{O0}}{7}([0-9A-Fa-f]{1,4}|:))|({{O0}}{6}(:[0-9A-Fa-f]{1,4}|({{O2}}(\\.{{O2}}){3})|:))|({{O0}}{5}(({{O1}}{1,2})|:({{O2}}(\\.{{O2}}){3})|:))|({{O0}}{4}(({{O1}}{1,3})|({{O1}}?:({{O2}}(\\.{{O2}}){3}))|:))|({{O0}}{3}(({{O1}}{1,4})|({{O1}}{0,2}:({{O2}}(\\.{{O2}}){3}))|:))|({{O0}}{2}(({{O1}}{1,5})|({{O1}}{0,3}:({{O2}}(\\.{{O2}}){3}))|:))|({{O0}}{1}(({{O1}}{1,6})|({{O1}}{0,4}:({{O2}}(\\.{{O2}}){3}))|:))|(:(({{O1}}{1,7})|({{O1}}{0,5}:({{O2}}(\\.{{O2}}){3}))|:)))(%.+)?\\s*$';
_shapeOf_string_ipv6_regex = _shapeOf_string_ipv6_regex.replace(/\{\{O0\}\}/g, _shapeOf_string_ipv6_o0);
_shapeOf_string_ipv6_regex = _shapeOf_string_ipv6_regex.replace(/\{\{O1\}\}/g, _shapeOf_string_ipv6_o1);
_shapeOf_string_ipv6_regex = _shapeOf_string_ipv6_regex.replace(/\{\{O2\}\}/g, _shapeOf_string_ipv6_o2);
_shapeOf_string_ipv6_regex = new RegExp(_shapeOf_string_ipv6_regex);

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
	let rtn;
	for (let i = 0; i < list.length; i++) {
		if (shapeOf(obj).shouldBeExactly(list[i]))
			return obj;
	}
};

/**
 * Validator for an object that must match each of a specified type of one or more types.
 * 
 *   shapeOf.eachOf(shapeOf.string, shapeOf.number);
 *   shapeOf.eachOf([shapeOf.string, shapeOf.number]);
 *
 * @param      {Array}   args    The arguments
 * @return     {Object}  Returns the object if valid, undefined otherwise
 */
let _shapeOf_eachOf = (...args) => {
	if (args.length < 2) {
		throw 'eachOfType validator requires at least one argument';
	}
	let obj = args.pop();
	let list = _flattenArgs(args);
	for (let i = 0; i < list.length; i++) {
		if (!shapeOf(obj).shouldBeExactly(list[i])) {
			if (shapeOf.isValidator(list[i])) {
				_validationLog(`Failed: Validator 'shapeOf.eachOf' -> '${list[i]._name}'`, obj);
			} else {
				_validationLog(`Failed: Validator 'shapeOf.eachOf' -> index ${i}`, obj);
			}
			return;
		}
	}
	_validationLog('Passed: Validator "shapeOf.eachOf"', obj);
	return obj;
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
			parent: 'shapeOf.number',
			requiredArgsCount: 2
		}
	},
	{
		name:     'shapeOf.number.min',
		callback: _shapeOf_greaterThanOrEqualTo,
		options: {
			parent: 'shapeOf.number',
			aliases: 'shapeOf.number.greaterThanOrEqualTo',
			requiredArgsCount: 1
		}
	},
	{
		name:     'shapeOf.number.max',
		callback: _shapeOf_lessThanOrEqualTo,
		options: {
			parent: 'shapeOf.number',
			aliases: 'shapeOf.number.lessThanOrEqualTo',
			requiredArgsCount: 1
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
			parent: 'shapeOf.integer',
			requiredArgsCount: 2
		}
	},
	{
		name:     'shapeOf.integer.min',
		callback: _shapeOf_greaterThanOrEqualTo,
		options: {
			parent: 'shapeOf.integer',
			aliases: 'shapeOf.integer.greaterThanOrEqualTo',
			requiredArgsCount: 1
		}
	},
	{
		name:     'shapeOf.integer.max',
		callback: _shapeOf_lessThanOrEqualTo,
		options: {
			parent: 'shapeOf.integer',
			aliases: 'shapeOf.integer.lessThanOrEqualTo',
			requiredArgsCount: 1
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
			aliases: 'shapeOf.string.ofSize',
			requiredArgsCount: 1
		}
	},
	{
		name:     'shapeOf.string.pattern',
		callback: _shapeOf_string_pattern,
		options: {
			parent: 'shapeOf.string',
			aliases: 'shapeOf.string.matching',
			requiredArgsCount: 1
		}
	},
	{
		name:     'shapeOf.string.email',
		callback: _shapeOf_string_email,
		options: {
			parent: 'shapeOf.string',
			aliases: 'shapeOf.string.ofEmail'
		}
	},
	{
		name:     'shapeOf.string.IPv4',
		callback: _shapeOf_string_ipv4,
		options: {
			parent: 'shapeOf.string',
			aliases: [
				'shapeOf.string.ofIPv4',
				'shapeOf.string.ipv4',
			]
		}
	},
	{
		name:     'shapeOf.string.IPv6',
		callback: _shapeOf_string_ipv6,
		options: {
			parent: 'shapeOf.string',
			aliases: [
				'shapeOf.string.ofIPv6',
				'shapeOf.string.ipv6',
			]
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
			aliases: 'shapeOf.array.ofSize',
			requiredArgsCount: 1
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
			aliases: 'shapeOf.arrayOf.ofSize',
			requiredArgsCount: 1
		}
	},
	{
		name:     'shapeOf.objectOf',
		callback: _shapeOf_objectOf
	},
	{
		name:     'shapeOf.oneOf',
		callback: _shapeOf_oneOf,
		options: {
			requiredArgsCount: 1
		}
	},
	{
		name:     'shapeOf.oneOfType',
		callback: _shapeOf_oneOfType,
		options: {
			requiredArgsCount: 1
		}
	},
	{
		name:     'shapeOf.eachOf',
		callback: _shapeOf_eachOf,
		options: {
			aliases: 'shapeOf.each',
			requiredArgsCount: 1
		}
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



// NOTE: The following variables are automatically updated when running 'npm run-script update-versions'
shapeOf._versionCompatibilityHistory = { // version: compatibleSchemaVersion
	'0.0.7': '0.0.7',
	'0.0.6': '0.0.6',
	'0.0.8': '0.0.8',
	'0.0.5': '0.0.5',
}; // end of shapeOf._versionCompatibilityHistory
shapeOf.version = "0.0.8"; // core version
shapeOf.compatibleSchemaVersion = "0.0.8"; // compatible schema version



module.exports = shapeOf;