# lwcp.js
This module implements parsing and message generation for Telos' Livewire Control Protocol.

## How to Use This Module
### Prerequisites
Runs in any modern browser or on Node.js. Distributed as an ES5 CommonJS module.
This project contains Typescript definitions and using Typescript is recommended.

### Including in Your Project
```bash
npm install --save telos-lwcp
```

### Example usage
Generate Message:
```typescript
import { LWCP } from 'telos-lwcp'

let msg = new LWCP.Message('call')      // We're going to place a call on a VX Engine
msg.addObj('studio').addObj('line', 5)  // Add objects
msg.setProp('number', '555-5555')       // Add properties
console.log(msg.toString())             // Print message as string
```
Parse data stream:
```typescript
import { LWCP } from 'telos-lwcp'

let par = new LWCP.Parser()             // Create parser      
while(true) {
  let data = get_data_from_somewhere()  // Read input
  parser.parse(data)                    // Parse data with LWCP message(s)
  parser.getMessages().forEach((msg: LWCP.Message) => {
    // Process message
  })
}
```
For the full interface, check the Typescript definitions file at dist/lwcp.d.ts.
For more usage examples see src/lwcp.spec.ts.

## How to Build
If you want to contribute to this project, here's how to get started. First, clone the repository:
```bash
git clone git@gitlab.zephyr.com:nodejs/lwcp.git
```

Next, install dependencies:
```bash
cd lwcp
npm install
```

Last, build the project and run unit tests:
```bash
npm start
```

### Other NPM Scripts
 - npm build - Compile .ts to .js files
 - npm test - Run Karma unit tests
 - npm clean - Remove build files