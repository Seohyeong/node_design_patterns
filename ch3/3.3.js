/*
Modify the function created in exercise 3.2 so that it emits a tick event immediately after the function is invoked.
*/

import { EventEmitter } from "node:events";

function ticker(ms, cb) {
    const emitter = new EventEmitter()
    const start = Date.now()
    let count = 0

    function tick() {
        const elapsed = Date.now() - start
        if (elapsed >= ms) {
            cb(count)
            return
        }

        emitter.emit('tick')
        count += 1

        setTimeout(tick, 50)
    }

    setTimeout(tick, 0)

    return emitter
}
