/*
Modify the function created in exercise 3.3 so that it produces an error if the timestamp at the moment 
of a tick (including the initial one that we added as part of exercise 3.3) is divisible by 5. 
Propagate the error using both the callback and the event emitter. 
Hint: use Date.now() to get the timestamp and the remainder (%) operator to check whether the timestamp is divisible by 5.
*/

/*
Modify the function created in exercise 3.2 so that it emits a tick event immediately after the function is invoked.
*/

import { EventEmitter } from "node:events";

function ticker(ms, cb) {
    const emitter = new EventEmitter()
    const start = Date.now()
    let count = 0

    function tick() {
        const now = Date.now()
        if (now % 5 === 0) {
            const err = new Error('Timestamp is divisible by 5')
            // 'error' is a speial event name, is no listener is registered for 'error', node throws
            emitter.emit('error', err)
            cb(err)
            return
        }

        const elapsed = now - start
        if (elapsed >= ms) {
            cb(null, count)
            return
        }

        emitter.emit('tick')
        count += 1

        setTimeout(tick, 50)
    }

    setTimeout(tick, 0)

    return emitter
}

const emitter = ticker(200, (err, count) => {
    if (err) {
        console.error('failed', err.message)
        return
    }
    console.log('done', count)
})

emitter.on('tick', () => {
    console.log('tick')
})

emitter.on('error', (err) => {
    console.log('event error:', err.message)
})