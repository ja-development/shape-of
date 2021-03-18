/*
 * shapeOf
 * Core Library
 * 
 * A lightweight schema validator for JSON endpoints.
 * 
 * 
 * shapeOf Primitive Types:
 *   shapeOf.string
 *   shapeOf.array
 *   shapeOf.bool
 *   shapeOf.number
 *   shapeOf.object
 *   shapeOf.null
 *   shapeOf.primitive  (string || bool || number || null)
 *   
 * shapeOf Composite Types:
 *   shapeOf.arrayOf
 *   shapeOf.objectOf
 *   shapeOf.oneOf
 *   shapeOf.oneOfType
 *   
 *   
 * Examples:
 *   shapeOf([1, 2, 3])
 *       .shouldBe(shapeOf.array);
 *   
 *   // true
 *   
 *   
 *   shapeOf({'foo': 'bar', 'baz': []})
 *       .shouldBe({'foo': shapeOf.string, 'baz': shapeOf.array});
 *  
 *   // true
 *   
 *   
 *   shapeOf({'foo': 'bar', 'baz': 'bom'})
 *       .shouldBe(shapeOf.objectOf(shapeOf.string));
 *       
 *   // true
 *   
 *   
 *   shapeOf('Hello world!')
 *       .shouldBe(shapeOf.oneOfType(shapeOf.string, shapeOf.null));
 *       
 *   // true
 *   
 *   
 *   shapeOf('Hello world!')
 *       .shouldBe(shapeOf.null);
 *   
 *   // false
 *   
 *   
 * Any shapeOf type functions can also be preceded with a .optional, which doesn't require keys for objects of a given name:
 *   shapeOf({'foo': 'bar'})
 *       .shouldBe({'foo': shapeOf.string, 'bom': shapeOf.optional.string});
 *       
 *   // true
 *   
 *   
 * 
 * A failed validation of data shape can also throw an exception if toggled to do so using .throwsOnInvalid:
 *   shapeOf('foo bar')
 *       .throwsOnInvalid
 *       .shouldBe(shapeOf.number);
 *   
 *   // throws an exception
 *   
 *   
 * 
 * Listeners can be used for (in)valid results:
 * 
 *   shapeOf({'foo': 'bar'})
 *       .onInvalid((obj) => console.log('Failed validation', obj))
 *       .onValid((obj) => console.log('Passed validation', obj))
 *       .shouldBe({'foo': shapeOf.number});
 *
 *   // results in console log: 'Failed validation', {'foo': 'bar'}
 *   
 *   
 *   shapeOf({'foo': 'bar'})
 *       .onInvalid((obj) => console.log('Failed validation', obj))
 *       .onValid((obj) => console.log('Passed validation', obj))
 *       .shouldBe({'foo': shapeOf.string});
 *
 *   // results in console log: 'Passed validation', {'foo': 'bar'}
 *   
 */

let shapeOf = function(obj) {
	return shapeOf._buildActions(this, obj);
};

/**
 * Create an object that returns after using one of the following:
 * 
 *  - shouldBe
 *  - shouldNotBe
 *  - throwsOnInvalid
 *  - onValid
 *  - onInvalid
 *  
 * These allow for chained calls directly after an initial shapeOf() call.
 *
 * @param      {object}  thisObj  The 'this' object, which is the shapeOf function
 * @param      {object}  obj      The object who's schema is in question
 * @param      {options} options  The accumulated options from the shapeOf chain calls
 * @return     {object}  An object for making chained calls
 */
shapeOf._buildActions = (thisObj, obj, options) => {
	options = options || {};
	let exclude = options.exclude || [];
	let rtn = {}

	delete options.exclude;

	if (exclude.indexOf('shouldBe') === -1)
		rtn.shouldBe = shapeOf._shouldBe.bind(thisObj, { obj, ...options });
	if (exclude.indexOf('shouldNotBe') === -1)
		rtn.shouldNotBe = ((obj, schema) => !shapeOf._shouldBe(obj, schema)).bind(thisObj, { obj, ...options });
	if (exclude.indexOf('throwsOnInvalid') === -1)
		rtn.throwsOnInvalid = shapeOf._buildActions(thisObj, obj, {exclude: ['throwsOnInvalid'], throwOnInvalid: true, ...options});
	if (exclude.indexOf('onInvalid') === -1)
		rtn.onInvalid = shapeOf._onInvalid.bind(thisObj, thisObj, { obj, ...options });
	if (exclude.indexOf('onValid') === -1)
		rtn.onValid = shapeOf._onValid.bind(thisObj, thisObj, { obj, ...options });
	if (exclude.indexOf('onComplete') === -1)
		rtn.onComplete = shapeOf._onComplete.bind(thisObj, thisObj, { obj, ...options });

	return rtn;
};

/**
 * Builds the actions on a shapeOf().onInvalid() call and adds a callback to the onInvalid list.
 * 
 * @param      {object}  thisObj  The 'this' object, which is the shapeOf function
 * @param      {options} options  The accumulated options from the shapeOf chain calls
 * @param      {Function}  callback  The callback to execute on an invalid evaluation
 * @return     {object}  An object for making chained calls
 */
shapeOf._onInvalid = (thisObj, options, callback) => {
	let callbacks = options.onInvalid || [];
	callbacks.push(callback);
	return shapeOf._buildActions(thisObj, options.obj, {onInvalid: callbacks, ...options});
};

/**
 * Builds the actions on a shapeOf().onValid() call and adds a callback to the onValid list.
 * 
 * @param      {object}  thisObj  The 'this' object, which is the shapeOf function
 * @param      {options} options  The accumulated options from the shapeOf chain calls
 * @param      {Function}  callback  The callback to execute on a valid evaluation
 * @return     {object}  An object for making chained calls
 */
shapeOf._onValid = (thisObj, options, callback) => {
	let callbacks = options.onValid || [];
	callbacks.push(callback);
	return shapeOf._buildActions(thisObj, options.obj, {onValid: callbacks, ...options});
};

/**
 * Builds the actions on a shapeOf().onComplete() call and adds a callback to the onComplete list.
 * 
 * NOTE: If .throwsOnInvalid has been toggled and an invalid evaluation occurs, the onComplete callbacks
 *       don't execute.
 * 
 * @param      {object}  thisObj  The 'this' object, which is the shapeOf function
 * @param      {options} options  The accumulated options from the shapeOf chain calls
 * @param      {Function}  callback  The callback to execute after a valid evaluation, or an invalid evaluation without a .throwsOnInvalid toggle
 * @return     {object}  An object for making chained calls
 */
shapeOf._onComplete = (thisObj, options, callback) => {
	let callbacks = options.onComplete || [];
	callbacks.push(callback);
	return shapeOf._buildActions(thisObj, options.obj, {onComplete: callbacks, ...options});
};

/**
 * Called whenever shapeOf().shouldBe is called.
 *
 * @param      {options} options  The accumulated options from the shapeOf chain calls
 * @param      {<type>}   schema   The schema supplied by the .shouldBe() call
 * @return     {boolean}  True if object in question follows provided schema
 */
shapeOf._shouldBe = (options, schema) => {
	let obj = options.obj;
	let rtn = false;
	if (typeof schema === 'function') {
		rtn = typeof schema(obj) !== 'undefined';
	} else if (typeof schema === 'object') {
		rtn = typeof shapeOf._object(obj, schema) !== 'undefined';
	} else {
		rtn = typeof schema === typeof obj;
	}
	if (options.onInvalid && !rtn) {
		options.onInvalid.forEach(callback => callback(obj, schema));
	}
	if (options.onValid && rtn) {
		options.onValid.forEach(callback => callback(obj, schema));
	}
	if (options.throwOnInvalid && !rtn)
		throw 'Invalid shape detected';
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
 * @return     {boolean}  { description_of_the_return_value }
 */
shapeOf._object = (obj, schema) => {
	if (typeof obj !== 'object')
		return;

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

		if (!shapeOf(valInQuestion).shouldBe(expected))
			return;
	}

	return true;
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
shapeOf.string._evaluator = true;

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
shapeOf.array._evaluator = true;

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
shapeOf.bool._evaluator = true;
shapeOf.boolean = shapeOf.bool;

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
shapeOf.number._evaluator = true;

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
shapeOf.object._evaluator = true;

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
shapeOf.null._evaluator = true;

/**
 * Validator for primitive types, which can be string, boolean, number, or null.
 *
 * @param      {object}  obj     The object in question
 * @return     {object}  Returns the object if valid, undefined otherwise
 */
shapeOf.primitive = (obj) => {
	return shapeOf.string(obj) || shapeOf.bool(obj) || shapeOf.number(obj) || shapeOf.null(obj);
};
shapeOf.primitive._evaluator = true;

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
	types = shapeOf._transformToArray(types, args);
	return shapeOf._arrayOf.bind(null, types);
};
shapeOf.arrayOf._evaluator = true;

/**
 * Validator that gets bound to specific types from a shapeOf.arrayOf() call.
 *
 * @param      {Array}   types   An array of type validators
 * @param      {object}  obj     The object in question
 * @return     {object}  Returns the object if is valid, otherwise undefined
 */
shapeOf._arrayOf = (types, obj) => {
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
	types = shapeOf._transformToArray(types, args);
	return shapeOf._objectOf.bind(null, types);
};
shapeOf.objectOf._evaluator = true;

/**
 * Validator that gets bound to specific types from a shapeOf.objectOf() call.
 *
 * @param      {Array}   types   An array of type validators
 * @param      {object}  obj     The object in question
 * @return     {object}  Returns the object if is valid, otherwise undefined
 */
shapeOf._objectOf = (types, obj) => {
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
	list = shapeOf._transformToArray(list, args);
	return shapeOf._oneOf.bind(null, list);
};
shapeOf.oneOf._evaluator = true;

/**
 * Validator that gets bound to specific types from a shapeOf.oneOf() call.
 *
 * @param      {Array}   types   An array of type validators
 * @param      {object}  obj     The object in question
 * @return     {object}  Returns the object if is valid, otherwise undefined
 */
shapeOf._oneOf = (list, obj) => {
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
	list = shapeOf._transformToArray(list, args);
	return shapeOf._oneOfType.bind(null, list);
};
shapeOf.oneOfType._evaluator = true;

/**
 * Validator that gets bound to specific types from a shapeOf.oneOfType() call.
 *
 * @param      {Array}   types   An array of type validators
 * @param      {object}  obj     The object in question
 * @return     {object}  Returns the object if is valid, otherwise undefined
 */
shapeOf._oneOfType = (list, obj) => {
	for (let i = list.length - 1; i >= 0; i--) {
		if (shapeOf(obj).shouldBe(list[i]))
			return obj;
	}
};

/**
 * Utility function use to change either an array or an object and an array of variadic arguments into a single array.
 *
 * @param      {Array|object}  list    Either an array of variadic arguments, or an object
 * @param      {Array}   args    An array of additional variadic arguments
 * @return     {Array}   Normalized array of arguments
 */
shapeOf._transformToArray = (list, args) => {
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
 * Generates and attaches optional equivalents of evaluator functions attached to the shapeOf object.
 * Any function is considered an evaluator function if the ._evaluator property is truthy on that function.
 * 
 * Once generated, the optional functions are available through the shapeOf.optional object. For example:
 *   shapeOf.optional.string   // The "optional" evaluator equivalent to shapeOf.string
 *   
 * Optional values are only used within a key-value paired object and apply to the key. Example:
 *   shapeOf({'foo': 'bar'}).shouldBe({'foo': shapeOf.string, 'baz': shapeOf.optional.primitive});   // true
 */
shapeOf.optional = (() => {
	let keys = Object.keys(shapeOf);
	let rtn = {};

	for (let i = keys.length - 1; i >= 0; i--) {
		let key = keys[i];
		if (key === 'optional' || key.startsWith('_'))
			continue;
		if (typeof shapeOf[key] !== 'function')
			continue;
		if (!shapeOf[key]._evaluator)
			continue;
		rtn[key] = (...args) => shapeOf[key](...args);
		rtn[key]._optional = true;
	}

	return rtn;
})();


module.exports = shapeOf;