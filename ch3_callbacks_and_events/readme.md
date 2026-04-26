# Chapter 3: Callbacks and Events

# 1. The Callback pattern

## 1) Callback
: function thst is passed as an argument to a funciton `f`. This callback function will be eventually called with the result of the operation when `f` completes. In functional programming, this way of propagating the result is called **continuation-passing style (CPS)**

### Synchronous CPS
A direct style in synchronous programming
```javascript
function add(a, b) {
    return a + b
}
```

The equivalent function using CPS style
```javascript
function addCPS(a, b, cb) {
    cb(a + b)
}

console.log('before')
addCPS(1, 2, (result) => {
    console.log(result)
})
console.log('after')
```
> before
> 3
> after

### Asynchronous CPS
```javascript
function addAsync(a, b, cb) {
    setTimeout(() => cb(a + b), 100)
}

console.log('before')
addAsync(1, 2, (result) => {
    console.log(result)
})
console.log('after')
```
> before
> after
> 3

## 2) Unleashing Zalgo
One of the most dangerous situations is to have an API that behaves synchronously under certain conditions and asynchronously under other.
```javascript
import { readFile } from 'node:fs'

const cache = new Map()
function inconsistentRead(filename, cb) {
    if (cache.has(filename)) {
        // invoked synchronously
        cb(cache.get(filename))
    } else {
        // asynchronous function
        readFile(filename, 'utf8', (_err, data) => {
            cache.set(filename, data)
            cb(data)
        })
    }
}
```
The following example illustrates one such unexpected side effect:
```javascript
function createFileReader(filename) {
    const listners = []
    inconsistentRead(filename, (value) => {
        for (const listener of listners) {
            listner(value)
        }
    })
    return {
        onDataReady: listener => listeners.push(listener)
    }
}
```
Let’s see how to use the `createFileReader()` function to read a `data.txt` file from the current working directory which contains the text some data:
```javascript
const reader1 = createFileReader('data.txt')
reader1.onDataReady(data => {
    console.log(`First call data: ${data}`)

    const reader2 = createFileReader('data.txt')
    reader2.onDataReady(data => {
        console.log(`Second call data: ${data}`)
    })
})
```
> First call data: some data

- During the creation of `reader1`, `inconsistentRead()` behaves asynchronously. This means any `onDataReady` listener will be invoked later in another cycle of the event loop, so we have all the time we need to register our listener.
- Then, `reader2` is created (cache for `data.txt` already exists) and `inconsistentRead()` will be synchronous. Its callback will be invoked immediately, but we are registering the listener after the creation of `reader2`.

## 3) The fix
1. Use synchronous APIs
2. Or make it to be fully asynchronous
```javascript
import { readFile } from 'node:fs'

const cache = new Map()
function inconsistentRead(filename, cb) {
    if (cache.has(filename)) {
        // deferred callback invocation
        process.nextTick(() => { 
            cb(cache.get(filename))
        })
    } else {
        // asynchronous function
        readFile(filename, 'utf8', (_err, data) => {
            cache.set(filename, data)
            cb(data)
        })
    }
}
```
> [!NOTE]
> working with `SetImmediate()`, `setTimeout()`, `process.nextTick()`
```javascript
setImmediate(() => {
  console.log('setImmediate(cb)')
})
setTimeout(() => {
  console.log('setTimeout(cb, 0)')
}, 0)
process.nextTick(() => {
  console.log('process.nextTick(cb)')
})
console.log('Sync operation')
```
Here's what we see:
> Sync operation
> process.nextTick(cb)
> setTimeout(cb, 0)
> setImmediate(cb)

## 4) Node.js callback conventions
### The callback is the last argument
```javascript
readFile(filename, [options], callback)
```

### Any error always comes first
In Node.js, any error produced by a CPS function is always passed as the first argument of the callback. If the operation succeeds without errors, the first argument will be `null` or `undefined`. The error must always be an instance of the `Error` class (strings or numbers should never be passed as error objects).
```javascript
readFile('foo.txt', 'utf8', (err, data) => {
    if (err) {
        handleError(err)
    } else {
        processData(data)
    }
})
```

### Propagating errors
#### Error propagation in synchronous functions
: `throw` statement which causes the error to jump up in the call stack until it is caught
```javascript
throw new Error('Something went wrong')
```

#### Error propagation in asynchronous COS
: pass the error to the next callback in the chain
```javascript
import { readFile } from 'node:fs'
function readJson(filename, callback) {
    readFile(filename, 'utf8', (err, data) => {
        let parsed
        if (err) {
            return callback(err)
        }
        try {
            parsed = JSON.parse(data)
        } catch (err) {
            return callback(err)
        }
        callback(null, parsed)
    })
}
```
- first possible error with `readFile()`: we do not throw it or return it, instead just invoke the `callback` with the error to propagate it back to the caller. `return` to stop the function execution.
- next possible error with `JSON.parse()`: synchronous function which will use the `throw` instruction to propagate errors to the caller. Need to use a `try/catch` block to capture errors. 
- finally, if everything went well, `callback` is invoked with `null` as the first argument

### Avoiding uncaught exceptions
For example, if we forgot to surround `JSON.parse()` with a `try...catch`, then the function happens to parse some invalid JSON at runtime. 

**Synchronous throw**: error walks up the current call stack
```javascript
function a() {
    b()
}

function b() {
    throw new Error('boom')
}

try {
    a()
} catch (err) {
    console.log('caught')
}
```
When `b()` throws: 
- `b` is on the stack
- `a` is on the stack
- the outer `try...catch` is still active
- so the error can move back up that stack and get caught

**async callback throw**: the original call stack is already gone, so there is nowhere useful for it to walk back to
```javascript
function a() {
    setTimeout(() => {
        throw new Error('boom')
    }, 0)
}

try {
    a()
} catch (err) {
    console.log('caught')
}
```
1. `a()` runs
2. `setTimeout(...)` schedules the callback for later
3. `a()` returns
4. the `try...catch` is finished
5. later, the timer callback runs
6. now it throws

This is why async APIs use: `callback(err)`

**`uncaughtException`**
When an execption ends up in the event loop, Node.js will emit a special event called `uncaughtException` before exiting the process.

```javascript
process.on('uncaughtException', (err) => {
    console.err(`This will catch at last the JSON parsing exception: `+`${err.message}`)
    process.exit(1)
})
```
It is advised to never leave the application running after an uncaught exception is received.

# 2. The Observer pattern
The observer pattern defines an object (called subject) that can notify a set of observers (os listeners) when a change in its state occurs.

The main difference from the Callback pattern is that the subject can notify multiple observers, while a traditional CPS callback will usually propagate its result to only one listener, the callback.

## 1) The EventEmitter
The Observer pattern is already built into the core and is available through the `EventEmitter` class. It allows us to register one or more functions as listenrs, which will be invoked when a particular event type is fired.
```javascript
import { EventEmitter } from 'node:events'
const emitter = new EventEmitter()
```

### Creating and using the EventEmitter
The following code shows us a function that uses an `EventEmitter` to notify its subscribers in real time when a particular regex is matched in a list of files:
```javascript
import { EventEmitter } from 'node:events'
import { readFile } from 'node:fs'
function findRegex(files, regex) {
    const emitter = new EventEmitter()
    for (const file of files) {
        readFile(file, 'utf8', (err, content) => {
            if (err) {
                return emitter.emit('error', err)
            }
            emitter.emit('fileread', file)
            const match = content.match(regex)
            if (match) {
                for (const elem of match) {
                    emitter.emit('found', file, elem)
                }
            }
        })
    }
    return emitter
}
```
`findRegex()` function can be used:
```javascript
findRegex(['fileA.txt', 'fileB.json'], /hello [\w.]+/)
    .on('fileread', file => console.log(`${file} was read`))
    .on('found', (file, match) => console.log(`Matched ${match} in ${file}`))
    .on('error', err => console.error(`Error emitted ${err.message}`))
```
> [!NOTE]
> The `EventEmitter` class treats the `error` events in a special way. It will automatically thow an exception and exit from the application if such an event is emitted and no associated listener is found. It is recommended to always register a listener for the `error` event.

### Making any object observable
In practice, `EventEmitter` is rarely used on its own, it is more common to see it extended by other classes.

```javascript
import { EventEmitter } from 'node:events'
import { readFile } from 'node:fs'
class FindRegex extends EventEmitter {
    constructor(regex) {
        super()
        this.regex = regex
        this.files = []
    }
    addFile(file) {
        this.files.push(file)
        return this
    }
    find() {
        for (const file of this.files) {
            readFile(file, 'utf8', (err, content) => {
                if (err) {
                    return this.emit('error', err)
                }
                this.emit('fileread', file)
                const match = content.match(this.regex)
                if (match) {
                    for (const elem of match) {
                        this.emit('found', file, elem)
                    }
                }
            })
        }
        return this
    }
}
```
and to use the `FindRegex` class:
```javascript
const findRegexInstance = new FindRegex(/hello [\w.]+/)
findRegexInstance
    .addFile('fileA.txt')
    .addFile('fileB.txt')
    .find()
    .on('found', (file, match) => {
        console.log(`Matched ${match} in file ${file}`)
    })
    .on('error', err => console.error(`Error emitted ${err.message}`))
```
> [!NOTE]
> It is extremely important to unsubscribe listeners once they are no longer needed. Unreleased `EventEmitter` listeners are the main source of memory leaks in Node.js
```javascript
emitter.removeListener('an_event', listener)
```

# 3. EventEmitter versus Callbacks
Use callbacks for returning results asynchronously, and events when you want to notify that something has happened, leaving it up to the consumer to decide whether to handle that event.

Illustration of the events API:
```javascript
import { EventEmitter } from 'node:events'
funciton hellowEvents () {
    const eventEmitter = new EventEmitter()
    setTimeout(() => eventEmitter.emit('complete', 'hello world'), 100)
    return eventEmitter
}

helloEvents().on('complete', message => {console.log(message)})
```

Illustration of the usage of callbacks:
```javascript
function helloCallback (cb) {
    setTimeout(() => cb(null, 'hello world'), 100)
}
helloCallback((_err, message) => console.log(message))
```

# 4. Combining callbacks and events
In some cases, you can use an `EventEmitter` alongside a callback. This pattern is very powerful and useful when you need to handle the final result of an asynchronous operation with a callback, but also want to emit progress events as the operation is ongoing.

```javascript
import { EventEmitter } from 'node:events'
import { get } from 'node:https'
function download(url, cb) {
    const eventEmitter = new EventEmitter()
    const req = get(url, resp => {
        const chunks = []
        let downloadedBytes = 0
        const fileSize = Number.parseInt(resp.headers['content-length'], 10)
        resp
            .on('error', err => { cb(err) })
            .on('data', chunk => {
                chunks.push(chunk)
                downloadedBytes = chunk.length
                eventEmitter.emit('progress', downloadedBytes, fileSize)
            })
            .on('end', () => {
                const data = Butter.concat(chunks)
                cb(null, data)
            })
    })
    req.on('error', err => { cb(err) })
    return eventEmitter
}
```
`get()` returns a request object (`req`), an `EventEmitter` that we can use. The callback receives a response object (`resp`), which is another `EventEmitter` that can notify us of other events such as `error`, `data`, `end`

How to use the `download()` funciton:
```javascript
download('https://example.com/somefile.zip', (err, data) => {
    if (err) {
        return console.error(`Download failed: ${err.message}`)
    }
    console.log('Download completed', data)
})
    .on('progress', (downloaded, total) => {
        console.log(`${downloaded}/${total}`)
    })
```