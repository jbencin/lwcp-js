import { LWCP } from './lwcp'

describe('LWCP Basic Tests', () => {
	it('Load LWCP test spec file', () => {
		expect(true).toBe(true)
	})

	it('Import LWCP module', () => {
		expect(LWCP).toBeTruthy()
	})
})

describe('LWCP.Message', () => {
	describe('Build a message with Legal Values', () => {
		let test = {
			cmd: 'call',
			objs: [
				{ name:  'studio',  id:    null, desc:    '     null id' },
				{ name:    'show',  id: 'room1', desc:    '    mixed id' },
				{ name:    'line',  id:     '1', desc:    '  numeric id' },
			],
			props: [
				{ name:  'number', val:   '101', desc:    'string value' },
				{ name:     'int', val:       5, desc:    '   int value' },
				{ name:   'empty', val:    null, desc:    ' empty value' }
			],
			sysProps: [
				{ name:    '$ack', val:  'true', desc:    'string value' }
			]
		}

		let msg  = new LWCP.Message(test.cmd)

		it(`Create Message '${test.cmd}'`, () => {
			expect(Boolean(msg)).toBe(true)
			expect(msg.op).toMatch(test.cmd)
		})

		describe('Message.addObj()', () => {
			for (let i in test.objs) {
				let obj = test.objs[i]
				if (obj.id) {
					it(`Test (${obj.desc}): ${obj.name}#${obj.id}`, () => {
						msg.addObj(obj.name, obj.id)
						expect(msg.objs[i].name).toBe(obj.name)
						expect(msg.objs[i].id).toBe(obj.id)
					})
				} else {
					it(`Test (${obj.desc}): ${obj.name}`, () => {
						msg.addObj(obj.name)
						expect(msg.objs[i].name).toBe(obj.name)
					})
				}
			}
		})

		describe('Message.setProp()', () => {
			for (let i in test.props) {
				let prop = test.props[i]
				if (prop.val) {
					it(`Test (${prop.desc}): ${prop.name}=${prop.val}`, () => {
						msg.setProp(prop.name, prop.val)
						expect(msg.getProp(prop.name)).toBe(prop.val)
					})
				} else {
					it(`Test (${prop.desc}): ${prop.name}`, () => {
						msg.setProp(prop.name)
						expect(msg.hasProp(prop.name)).toBe(true)
					})
				}
			}
		})

		describe('Message.addProp(): sysprops', () => {
			for (let i in test.sysProps) {
				let sysProp = test.sysProps[i]
				if (sysProp.val) {
					it(`Test (${sysProp.desc}): ${sysProp.name}=${sysProp.val}`, () => {
						msg.setProp(sysProp.name, sysProp.val)
						expect(msg.getProp(sysProp.name)).toBe(sysProp.val)
					})
				} else {
					it(`Test (${sysProp.desc}): ${sysProp.name}`, () => {
						msg.setProp(sysProp.name)
						expect(msg.hasProp(sysProp.name)).toBe(true)
					})
				}
			}
		})
	})
})

describe('LWCP.Parser', () => {

	it(`Create Parser`, () => {
		let parser = new LWCP.Parser
		expect(Boolean(parser)).toBe(true)
	})

	describe('Parser.parseValue()', () => {
		let parser = new LWCP.Parser
		// Text 'in' should parse to value 'val'
		let test = [
			{ in:                                '100', val:               100, desc: '            positive integer'},
			{ in:                              '+5555', val:              5555, desc: '   explicit positive integer'},
			{ in:                               '-100', val:              -100, desc: '            negative integer'},
			{ in:                               '0xFF', val:               255, desc: '                 hex integer'},
			{ in:                            '    100', val:               100, desc: '  leading whitespace integer'},
			{ in:                             '3.1415', val:            3.1415, desc: '     positive floating point'},
			{ in:                            '+3.1415', val:            3.1415, desc: 'exp. positive floating point'},
			{ in:                            '-3.1415', val:           -3.1415, desc: '     negative floating point'},
			{ in:                                 '[]', val:                [], desc: '                 empty array'},
			{ in:                                '[1]', val:               [1], desc: '                simple array'},
			{ in:                  '["str",  2.5, ""]', val:  ['str', 2.5, ''], desc: '                 mixed array'},
			{ in:                   '[[], [1,2], "a"]', val:  [[], [1,2], 'a'], desc: '                    2d array'},
			{ in:                    '[ [ 1 ] , [ ] ]', val:         [[1], []], desc: '         whitespace in array'},
			{ in:                           'ENUM_999', val:        'ENUM_999', desc: '                 enum string'},
			{ in:                    '"hello, world!"', val:   'hello, world!', desc: '        double quoted string'},
			{ in:                    "'hello, world!'", val:   'hello, world!', desc: '        single quoted string'},
			{ in:   '%BeginEncap% "Hello", %EndEncap%', val:      ' "Hello", ', desc: '                encap string'},
			{ in:                                 '""', val:                '', desc: '   double quoted null string'},
			{ in:                                 "''", val:                '', desc: '   single quoted null string'},
			{ in:             '%BeginEncap%%EndEncap%', val:                '', desc: '           encap null string'},
			{ in:                                '!!!', val:              null, desc: '               illegal input'},
			{ in:                                 '()', val:              null, desc: '               illegal input'},
			{ in:                                  '"', val:              null, desc: '               illegal input'},
			{ in:                                  "'", val:              null, desc: '               illegal input'},
			{ in:                                  '%', val:              null, desc: '               illegal input'},
			{ in:            '%BeginEncap% Not Closed', val:              null, desc: '               illegal input'},
			{ in:                         '%EndEncap%', val:              null, desc: '               illegal input'},
			{ in:                                 '][', val:              null, desc: '               illegal input'},
			{ in:                                   '', val:              null, desc: '               illegal input'},
			{ in:                              '     ', val:              null, desc: '               illegal input'},
		]

		for (let i in test) {
			let e = test[i]
			it(`Test (${e.desc}): ${e.in}`, () => {
				let v = new LWCP.Value()
				parser.parseValue(v, e.in)
				expect(v.equals(e.val)).toBe(true)
			})
		}
	})
	describe('Parser.parseMessage()', () => {
		let parser = new LWCP.Parser
		let str = '  call   studio#room700.line#3    number="555-1234" , hybrid = false  $ack '
		it(`Test: ${str}`, () => {
			parser.parseMessage(str)
			let msg = parser.getMessage()
			expect(msg).toBeTruthy()
			expect(msg.op).toBe('call')
			expect(msg.objs[0].name).toBe('studio')
			expect(msg.objs[0].id).toBe('room700')
			expect(msg.objs[1].name).toBe('line')
			expect(msg.objs[1].id).toBe('3')
			expect(msg.getProp('number')).toBe('555-1234')
			expect(msg.getProp('hybrid')).toBe('false')
		})
	})
	describe('Parser.getLineFromBuffer()', () => {
		let parser = new LWCP.Parser
		let str = [
			`drop studio.line#1`,
			`drop studio.line#2 data=%BeginEncap%  ""'',, %EndEncap%    data2=%BeginEncap%%EndEncap%`,
			`drop studio.line#3 data=%BeginEncap%`,
			`%EndEncap%`,
			`drop studio.line#4`,
			``
		].join('\n')
		it(`Test: ${str}`, () => {
			parser.addDataToBuffer(str)
			let line = parser.getLineFromBuffer().trim()
			expect(line).toBe(`drop studio.line#1`)
			line = parser.getLineFromBuffer().trim()
			expect(line).toBe(`drop studio.line#2 data=%BeginEncap%  ""'',, %EndEncap%    data2=%BeginEncap%%EndEncap%`)
			line = parser.getLineFromBuffer().trim()
			expect(line).toBe([`drop studio.line#3 data=%BeginEncap%`,`%EndEncap%`].join('\n'))
			line = parser.getLineFromBuffer().trim()
			expect(line).toBe(`drop studio.line#4`)
		})
	})
	describe('Parser.parse()', () => {
		let parser = new LWCP.Parser
		let str = [
			`  call   studio#room700.line#3    number="555-1234" , hybrid = false  $ack  `,
			` drop   studio.line#6`,
			``
		].join('\n')
		it(`Test: ${str}`, () => {
			parser.parse(str)
			let msg = parser.getMessage()
			expect(msg).toBeTruthy()
			expect(msg.op).toBe('call')
			expect(msg.objs[0].name).toBe('studio')
			expect(msg.objs[0].id).toBe('room700')
			expect(msg.objs[1].name).toBe('line')
			expect(msg.objs[1].id).toBe('3')
			expect(msg.getProp('number')).toBe('555-1234')
			expect(msg.getProp('hybrid')).toBe('false')
			msg = parser.getMessage()
			expect(msg).toBeTruthy()
			expect(msg.objs[0].name).toBe('studio')
			expect(msg.objs[1].name).toBe('line')
			expect(msg.objs[1].id).toBe('6')
		})
	})
})