export namespace LWCP {

	export enum Err {
		NONE            = "No Error",
		NOMSG           = "No Message",
		IGNORED         = "Message Ignored",
		DELAYMSG        = "Message Delayed",
		NOTFOUND        = "Not Found",
		NOTIMPLEMENTED  = "Not Implemented",
		EXISTS          = "Already Exists",
		READONLY        = "Read Only",
		WRITEONLY       = "Write Only",
		NOMEM           = "Out of Memory",
		BADPTR          = "Bad Pointer",
		BADAUTH         = "Unauthorized",
		BADSTATE        = "Bad Internal State",
		BADTYPE         = "Incorrect Type",
		ENDSTREAM       = "End of Stream",
		OTHER           = "Unknown Error",
		MSG_INCOMPLETE  = "Message Incomplete",
		MSG_NOID        = "Missing Identifier",
		MSG_INVID       = "Invalid Identifier",
		MSG_NOOP        = "Missing Operation",
		MSG_INVOP       = "Invalid Operation",
		MSG_NOOBJ       = "Missing Object",
		MSG_INVOBJ      = "Invalid Object",
		MSG_INVPROP     = "Invalid Property",
		MSG_INVSPROP    = "Invalid System Property",
		MSG_INVVAL      = "Invalid Value",
		MSG_SYNTAX      = "Message Syntax Error",
		MSG_OTHER       = "Unknown Message Error",
	}

	export enum Type {
		INVALID = "INVALID", // Invalid data type
		NONE    = "NONE",    // Property with no value
		NUMBER  = "NUMBER",  // Int or Float
		STRING  = "STRING",  // ASCII string
		ARRAY   = "ARRAY",   // Array of some other type
		ENUM    = "ENUM",    // Enumerated value
		ENCAP   = "ENCAP",   // Data enclosed by %BeginEncap% and %EndEncap%
		OTHER   = "OTHER",   // Can use when building message for user formatted data
	}

	export enum Encap {
		BEGIN  = "%BeginEncap%", // This string signals start of encap data
		END    = "%EndEncap%",   // This string signals end of encap data
	}

	// Constants
	const RGX_LWCP_NAME  = /^[a-z]\w*$/i;
	const RGX_PROP_NAME  = /^\$?[a-z]\w*$/i; // Same as above with optional '$'
	const RGX_OBJ_ID     = /^\w+$/;

	// LWCP Object type. Can't use name 'Object' because that's already defined in Javascript
	export class Obj {
		name:  string;
		id:    string;

		constructor(name: string, id?: string) {
			this.setName(name);
			this.setID(id);
		}

		setName(name: string) : Obj {
			if (!RGX_LWCP_NAME.test(name)) throw `Obj.setName(): Invalid argument '${name}'`;
			this.name = name;
			return this;
		}

		setID(id?: string) : Obj {
			if (RGX_OBJ_ID.test(id)) {
				this.id = id;
			} else {
				this.id = '';
				if (id) throw `Obj.setID(): Invalid argument '${id}'`;
			}
			return this;
		}

		toString() : string {
			return [this.name, this.id].filter(e => e).join('#');
		}
	}

	// LWCP Value
	export class Value {
		type:  Type;        // LWCP type, not Javascript type
		val:   any;         // Value

		constructor(val: any = null, type?: Type) {
			this.setVal(val);
			if (type) {
				this.setType(type);
			}
		}

		setVal(val: any = null) : Value {
			// Note on null vs undefined:
			//   null      / Type.NONE    = Used when property has no value
			//   undefined / Type.INVALID = Used when trying to assign illegal value
			if (val === null) {
				this.type = Type.NONE;
				this.val  = null;
				return this;
			}

			switch (typeof(val)) {
				case "number":
					this.type = Type.NUMBER;
					this.val  = val;
					return this;
				case "string":
					this.type = Type.STRING;
					this.val  = val;
					return this;
				case "boolean":
					break;
				case "object":
					if (Array.isArray(val)) {
						this.type = Type.ARRAY;
						this.val  = val;
						return this;
					}
					break;
				case "function":
					// I'm going to allow this, but for simplicity evalate on set
					// Don't return another function from this or you'll get a stack overflow!!!
					this.setVal(val());
					return this;
				case "undefined":
					this.type = Type.INVALID;
					this.val  = undefined;
					return this;
			}

			// Default for anything we don't handle above
			this.type = Type.OTHER;
			this.val  = val;
			return this;
		}

		setType(type: Type) : Value {
			// Can only switch between string types
			switch (this.type) {
				case Type.ENCAP:
				case Type.STRING:
				case Type.ENUM:
					this.type = type;
					return this;
			}
			console.error(`Value.setVal(): Cannot set type of ${this.type} to ${type}`);
			return this;
		}

		// Compare for equality to Javascript value/object/array
		equals (v: any) : boolean {
			if (Array.isArray(this.val)) {
				if (this.val.length !== v.length) return false;
				for (let j in this.val) {
					if (!this.val[j].equals(v[j])) return false;
				}
				return true;
			} else {
				return this.val === v;
			}
		}

		// Convert to regular Javascript object
		toVal() : any {
			switch (this.type) {
				case Type.INVALID:
				case Type.NONE:
				case Type.NUMBER:
				case Type.ENUM:
				case Type.OTHER:
				case Type.ENCAP:
				case Type.STRING:
					// Nothing special needs to be done
					return this.val;
				case Type.ARRAY:
					// Will recursively call toVal() on elements
					return this.val.map((e: Value) => e.toVal());
			}
		}

		toString() : string {
			switch (this.type) {
				case Type.INVALID:
				case Type.NONE:
					return "";
				case Type.NUMBER:
				case Type.ENUM:
				case Type.OTHER:
					// Nothing special needs to be done, just use toString()
					return this.val.toString();
				case Type.ENCAP:
					// Embed value encap tags
					return `${Encap.BEGIN}${this.val.toString()}${Encap.END}`
				case Type.STRING:
					// Embed value in double qoutes
					return `"${this.val.toString()}"`
				case Type.ARRAY:
					// Return comma separated list embedded in square brackets
					let strArr = this.val.map((e: Value) => e.toString());
					return `[${strArr.join(',')}]`;
			}
		}
	}

	export class PropMap extends Object {
		// Returns array like this: [['prop1'], ['prop2', 'val2'], ['prop3']]
		toArray2d() : string[][] {
			return Object.keys(this).map(key => [key, this[key].toString()].filter(e => e))
		}

		// Returns array like this: ['prop1', 'prop2=val2', 'prop3']
		toArray1d() : string[] {
			return this.toArray2d().map(e => e.join('='))
		}
	}

	export class Message {
		op:       string;  // LWCP operation. Also determines if message is valid
		objs:     Obj[];   // List of Objects/Selectors
		props:    PropMap; // LWCP Properties
		sysProps: PropMap; // LWCP System Properties

		constructor(op: string) {
			this.setOp(op);
			this.objs     = [];
			this.props    = new PropMap();
			this.sysProps = new PropMap();
		}

		// DO NOT SET FIELDS DIRECTLY, USE add/set FUNCTIONS TO DO SO SAFELY!!!
		// Also, all the add/set functions should return 'this' to allow chaining
		setOp(op: string) : Message {
			if (!RGX_LWCP_NAME.test(op)) throw `Message.setOp(): Invalid argument '${op}'`;
			this.op = op;
			return this;
		}

		addObj(obj: Obj | string, ...args: any[]) : Message {
			// Can use either existing obj or make new obj from string+args
			if ( !(obj instanceof Obj) ) {
				obj = new Obj(obj, ...args);
			}
			this.objs.push(obj);
			return this;
		}

		// Use same interface for adding props and sysprops so user doesn't have to think about it
		setProp(name: string, ...args: any[]) : Message {
			// Can use either existing prop or make new prop from string+args
			let val = args[0];
			if ( !(val instanceof Value) ) {
				val = new Value(...args);
			}
			if (name[0] !== '$') {
				this.props[name] = val;
			} else {
				this.sysProps[name] = val;
			}
			return this;
		}

		// Get Property as LWCP value
		getPropAsValue(name: string) : Value | undefined {
			return this.props[name] || this.sysProps[name];
		}

		// Get Property as Javascript object/value
		getProp(name: string) : any {
			return this.getPropAsValue(name).toVal();
		}

		hasProp(name: string) : boolean {
			return Boolean(this.getPropAsValue(name));
		}

		toString() : string {
			// Write all 4 sections out as elements of an array
			let strArr = [this.op];
			strArr.push(this.objs.map(e => e.toString()).join('.'));
			strArr.push(this.props.toArray1d().join(','));
			strArr.push(this.sysProps.toArray1d().join(' '));

			// Remove null strings and join array with spaces
			return strArr.filter(e => e).join(' ');
		}

		// '\n' terminated message
		toStringTerm() : string {
			return `${this.toString()}\n`;
		}
	}

	export class Parser {
		private buffer:   string;    // Buffer to be parsed
		private messages: Message[]; // Parsed messages waiting in queue

		constructor() {
			this.buffer   = '';
			this.messages = [];
		}

		// Parse text which may contain one or more messages
		// THIS IS THE ONLY PARSE FUNCTION YOU SHOULD CALL EXTERNALLY!!!
		parse(data: string) {
			this.addDataToBuffer(data);

			while (true) {
				let msg = this.getLineFromBuffer();
				if (!msg) break;
				this.parseMessage(msg);
			}
		}

		// Take a parsed message from internal msg queue
		getMessage() : Message {
			return this.messages.shift();
		}

		// Take all messages
		getMessages() : Message[] {
			let arr = this.messages;
			this.messages = [];
			return arr;
		}

		addDataToBuffer(data: string) {
			this.buffer += data;
		}

		stripLeadingRegex(buf: string, regex: RegExp) : string {
			let match = regex.exec(buf);
			if (!match) return buf;
			return buf.slice(match[0].length);
		}

		// Returns null if no more message
		getLineFromBuffer() {
			let pos = 0;
			let end = 0;
			let msg = '';

			// Find end of first message. Return if not found (incomplete)
			do {
				// Find next newline
				end = this.buffer.indexOf('\n', pos);
				if (end < 0) return null; // Incomplete message, return and wait for more data
				msg = this.buffer.slice(0, end+1);

				// Make sure that newline wasn't in an encap tag
				do {
					let enBegin = msg.indexOf(Encap.BEGIN, pos);
					if (enBegin < 0) break; // If no begin tag in message, we're okay, break

					let enEnd = this.buffer.indexOf(Encap.END, enBegin);
					if (enEnd < 0) return null; // If begin tag but no matching end tag, incomplete message, return
					pos = enEnd;
				} while (pos < end); // If we've gone past end of message, we need to enlarge message to next newline
			} while (pos > end); // This will be true if and only if newline was inside encap tags

			// Remove message out of buffer
			this.buffer = this.buffer.slice(end+1);
			return msg;
		}

		// Parse single message
		parseMessage(buf: string) {
			let msg = null;

			do { // This loop exists only so I can break from it
				buf = buf.trim();

				// Parse command
				let match = /^[\S]+/.exec(buf);
				if (!match) return;
				try {
					msg = new Message(match[0]);
				} catch(e) {
					console.error(e);
					return;
				}
				buf = buf.slice(match[0].length).trim();

				// Parse object
				match = /^[\S]+/.exec(buf);
				if (!match) break;
				for (let obj of match[0].split('.')) {
					let objParts = obj.split('#');
					try {
						msg.addObj(objParts[0], objParts[1]);
					} catch(e) {
						console.error(e);
						return;
					}
				}
				buf = buf.slice(match[0].length).trim();

				// Parse properties
				this.parsePropList(msg, buf);

			} while(false);

			// Success, put message on queue
			if (msg) this.messages.push(msg);
		}

		parsePropList(msg: Message, buf: string) {
			// Don't be strict about what we accept here
			// Parse space or comma separated list of props/sysprops, in any order
			// This makes parsing easier and results in less code
			while (true) {
				buf = this.stripLeadingRegex(buf, /^[\s,]*/);
				let match = /^\$?[a-z]\w*/.exec(buf);
				if (!match) return; // End of list
				let name = match[0];
				// Remove name from buffer
				buf = buf.slice(name.length).trim();
				// If next non-ws char is '=', property has a value
				if (buf[0] === '=') {
					let val = new Value();
					buf = this.parseValue(val, buf.slice(1));
					msg.setProp(name, val);
				} else {
					msg.setProp(name);
				}

			}
		}

		parseValue(val: Value, buf: string) : string {
			buf = buf.trim();

			// Array is special case, we can't parse this as a regex
			if (buf[0] === '[') {
				buf = buf.slice(1); // Remove '['
				let arr = [];
				while (true) {
					buf = buf.trim();

					let c = buf[0];
					if (c === ']') {
						buf = buf.slice(1); // Remove ']' and terminate array
						break;
					} else if (c === ',') {
						buf = buf.slice(1); // Remove ',' and continue to next value
					} else {
						let v = new Value();
						buf = this.parseValue(v, buf);
						if (v.val === null) {
							console.error(`Message.parseValue(): Illegal character '${c}' in array`);
							break;
						}
						arr.push(v);
					}
				}
				val.setVal(arr);
				return buf;
			}

			// Loop only so we can use 'break'
			let match;
			do {
				// Test for double-quoted string
				match = /^"((\\.|[^"\\])*)"/.exec(buf);
				if (match) {
					val.setVal(match[1]).setType(Type.STRING);
					break;
				}
				// Test for single-quoted string
				match = /^'((\\.|[^'\\])*)'/.exec(buf);
				if (match) {
					val.setVal(match[1]).setType(Type.STRING);
					break;
				}
				// Test for enum
				match = /^[a-z]\w*/i.exec(buf);
				if (match) {
					val.setVal(match[0]).setType(Type.ENUM);
					break;
				}
				// Test for number
				match = /^[0-9a-fx.+\-]+/i.exec(buf);
				if (match) {
					let num = match[0];
					if (num.indexOf('.') < 0) {
						val.setVal(parseInt(num));
					} else {
						val.setVal(parseFloat(num));
					}
					break;
				}
				// Test for encap
				match = RegExp(`^${Encap.BEGIN}(.*)${Encap.END}`).exec(buf);
				if (match) {
					val.setVal(match[1]).setType(Type.ENCAP);
					break;
				}
				// Couldn't parse as anything, skip to next whitespace or comma
				match = /^[^\s,]*/.exec(buf);
				console.error(`Message.parseVal(): Cannot parse '${match[0]}' into value`);
			} while (false);

			// We end up here for all cases we use regex for (all except array)
			// Remove matched value (even if invalid) from buffer
			// match CANNOT be undefined at this point
			return buf.slice(match[0].length);
		}
	}
};