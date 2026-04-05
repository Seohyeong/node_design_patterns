/*
Write a function that accepts a number and a callback as the arguments. 
The function will return an EventEmitter that emits an event called tick every 50 milliseconds until the number of milliseconds is passed from the invocation of the function. 
The function will also call the callback when the number of milliseconds has passed, providing, as the result, the total count of tick events emitted. 
Hint: you can use setTimeout() to schedule another setTimeout() recursively.
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

    setTimeout(tick, 50)

    return emitter
}

// ticker(200, (count) => console.log(count))

const emitter = ticker(200, (count) => {
    console.log('done: ', count)
})
emitter.on('tick', () => {
    console.log('ticking...')
})