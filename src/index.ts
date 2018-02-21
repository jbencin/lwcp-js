import { LWCP } from "./lwcp"

export default class Main {
    constructor() {
        console.log('LWCP demo app launched');
    }

    printMsg() : void {
        let msg = new LWCP.Message('call');
        msg.addObj('studio', '1').addObj('line', '3');
        msg.addProp('number', '101');
        msg.addProp('$ack');
        console.log(`Message 1: ${msg}`);
    }
}

let start = new Main();
start.printMsg();