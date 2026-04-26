# Chapter 4: Asynchronous Control Flow Patterns with Callbacks

# 1. The challenges of asynchronous programming

## 1) webspider example
- `exists`: a callback-based funciton that checks if a file exists in the filesystem
- `get`: a callback-based funciton that retrievs the body of an HTTP response for a given URL
- `recursiveMkdir`: a callback-based funciton that creates all necessary directories recursively within a specified path
- `urlToFilename`: a synchronous function that converts a URL into a valid file system name.

```javascript
import { writeFile } from 'node:fs'
import { dirname } from 'node:path'
import { exists, get, recursiveMkdir, urlToFilename} from '/utils.js'

export function spider(url, cb) {
    const filename = urlToFilename(url)
    exists(filename, (err, alreadyExists) => { // 1
        if (err) {  // 1.1
            cb(err)  
        } else if (alreadyExists) { // 1.2
            cb(null, filename, false)
        } else { // 1.3
            console.log(`Downloading ${url} into ${filename}`)
            get(url, (err, content) => { // 2
                if (err) {
                    cb(err)
                } else {
                    recursiveMkdir(dirname(filename), err => { // 3
                        if (err) {
                            cb(err)
                        } else {
                            writeFile(filename, content, err => { // 4
                                if (err) {
                                    cb(err)
                                } else {
                                    cb(null, filename, true) // 5
                                }
                            })
                        }
                    })
                }
            })
        }
    })
}
```

## 2) Callback hell
This is a common issue with asynchrounous code. Here's what the implementation could look assuming we had equivalent blocking APIs:
```javascript
export funciton spider(url) {
    const filename = urlToFilename(url)
    if (exists(filename)) {
        return false
    } else {
        const content = get(url)
        recursiveMKdir(dir(filename))
        writeFile(filename, content)
    }
}
```
Note that we don't need to handle errors explicitly, **any synchronous exception will automatically propagate up the call stack.**

## 3) Callback best practices and discipline
Here are a few basic principles that can help reduce nesting and improve code organization overall:

### Exit early
Uuse `return`, `continue`, or `break` to exit a statement immediately, instead of nesting full `if...else` blocks.

Instead of writing:
```javascript
if (err) {
    cb(err)
} else {
    // code to execute
}
```
Use the early return principle:
```javascript
if (err) {
    return cb(err)
}
```
> [!NOTE]
> A common mistake is forgetting to terminate the funciton after the callback is invoked. Never forget that the execution of our funciton will continue even after we invoke the callback. It is then important to insert a `return` to block the esecution of the rest of the funciton. Also note that is doesn't really matter what value is returned by the funciton, the real result is produced asynchronously and passed to the callback.

### Use named funcitons for callbacks
Move callbacks out of closures, and pass intermediate results as arguemnts. Named functions also provide clearer stack traces.

### Modularize your code
Break your code into smaller, reusable functions whenever possible.

With our `spider()` function, the functionality that writes a given string to a file and that downloads can be easily factored out into a separate function:
```javascript
funciton saveFile(filename, content, cb) {
    recursiveMkdir(dirname(filename), err => {
        if (err) { return cb(err) }
        writeFile(filename, content, cb)
    })
}

function download(url, filename, cb) {
    console.log(`Downloading ${url} into ${filename}`)
    get(url, (err, content) => {
        if (err) { return cb(err) }
        saveFile(filename, content, err => {
            if (err) { return cb(err) }
            cb(null, content)
        })
    })
}
```
Then `spider()` becomes:
```javascript
export function spider(url, cb) {
    const filename = urlToFilename(url)
    exists(filename, (err, alreadyExists) => {
        if (err) { return cb(err) }
        if (alreadyExists) { return cb(null, filename, false) }
        download(url, filename, err => {
            if (err) { return cb(err) }
            cb(null, filename, true)
        })
    })
}
```

# 2. Control flow patterns

## 1) Sequential Execution
This is an example of sequential execution flow with three tasks.
```
start -> task 1 -> task 2 -> task 3 -> end
```
There are different variations of this flow:
- executing a set of known tasks in sequence, without propagating data across them
- using the output of a task as the input for the next (aka chain, pipeline, or waterfall)
- iterating over a colleciton while running an asynchronous task on each element, one after the other

### The pattern
We already delved into the concept of sequential execution flow while implementing the `spider()` function. It performs several asynchronous tasks in a speficif order, with each task completing before the next begins: checking if the file exists, downloading content and saving that content to a file.
```javascript
function task1(cb) {
    asyncOperation(() => {
        task2(cb) // calls task2 with the current callback
    })
}
function task2(cb) {
    asyncOperation(() => {
        task3(cb) // calls task3 with the current callback
    })
}
function task3(cb) {
    asyncOperation(() => {
        cb() // finally completes and executes the callback
    })
}
task1(() => {
    // executed when task1, task2, task3 are completed
    console.log('tasks 1, 2, and 3 executed')
})
```

## 2) Sequential Iteration
The sequential execution pattern works great when we know in advance which tasks need to be executed and how many there are. This lets us hardcode the invocation of each subsequent task in the sequence.

But what happens when we want to perform an asynchronous operation for every item in a collection? We can't hardcode the task sequence anymore, instead we need to build it dynamically.

### Spider: add downloading all links on a web page recursively
The first step is to modify our `spider()` function to trigger a recursive download of the page's links by using a new funciton called `spiderLinks()`. To prevent the spider from getting stuck in an endless loop, we introduce a `maxDepth` parameter that limits the recursion depth.
```javascript
export function spider(url, maxDepth, cb) {
    const filename = urlToFilename(url)
    exists(filename, (err, alreadyExists) => {
        if (err) { return cb(err) }
        if (alreadyExists) {
            if (!filename.endsWith('.html')) { return cb() }
            // If the page was already downloaded, read the contents and download the links
            return readFile(filename, 'utf8', (err, fileContent) => {
                if (err) { return cb(err) }
                return spiderLinks(url, fileContent, maxDepth, cb)
            })
        }
        // The file does not exist, download it
        download(url, filename, (err, fileContent) => {
            if (err) { return cb(err) }
            // if the file is an HTML file, spider it
            if (filename.endsWith('.html')) {
                return spiderLinks(url, fileContent.toString('utf8'), maxDepth, cb)
            }
            // otherwise, stop here
            return cb()
        })
    })
} 
```

`spiderLinks()` downloads all the linkes on an HTML page using a sequential asynchronous iteration algorithm:
```javascript
function spiderLinks(currentUrl, body, mxDepth, cb) {
    if (maxDepth === 0) { return process.nextTick(cb) } // NOTICE
    const links = getPageLinks(currentUrl, body)
    if (links.length === 0) { return process.nextTick(cb) }

    function iterate(index) {
        if (index === links.length) { return cb() }
        spider(linkes[index], maxDepth - 1, err => { 
            if (err) { return cb(err) }
            iterate(index + 1)
        })
    }

    iterate(0)
}
```
The algorithm allows us to iterate over an array by executing an asynchronous operation sequentially, which is the `spider()` funciton.

Notice how we call the callback asynchronously to avoid the infamous Zalgo. If `maxDepth === 0`, there's nothing to do and if there are links, it calls async `spider()`. So without process.nextTick(cb), one branch would finish immediately and another branch would finish later

```javascript
let completed = false
spiderLinks(url, body, 0 () => { completed = true })
console.log(completed)
```
If `maxDepth === 0` used plain `cb()`, output would be:
> true
But if `maxDepth > 0` and `spiderLinks()` did async work, output would be:
> false
because the callback runs later.

### The Pattern
```javascript
function iterate (index) {
    if (index === tasks.length { return finish() })
    const task = tasks[index]
    task(() => iterate(index + 1))
}

function finish() {
    // iteration completed
}

iterate(0)
```

## 3) Concurrent Execution

### Parallelism
If you have two chefs, each can prepare an order simultaneously, working completely independently. This is like having multiple CPU cores executing tasks in parallel.

### Concurrency
If there's only one chef, they need to divide their time efficiently. While wating for water to boil for one dish, they can start chopping indgredients for the other. The chef isn't working on both tasks simultaneously but is making progress on both. This is how an event loop works, switching between tasks efficiently while waiting on slower operations like I/O.

> [!NOTE]
> In Node.js, we generally exeute asynchronous operations concurrently, because their concurrency is handled internally by the non blocking APIs. In Node.js, synchronous operations can't be easily parallelized or run concurrently unless their execution is interleaved with an asynchronous operation, or interleaved with `setTimeout()` or `setImmediate()`.

So far, our application is executing the recursive download of the linked pages in a sequential fashion. We can easily improve the performance of this process by downloading all the linked pages concurrently.

```javascript
function spiderLinks(currentUrl, body, maxDepth, cb) {
    if (maxDepth === 0) { return process.nextTick(cb) }
    const links = getPageLinks(currentUrl, body)
    if (links.length === 0) { return process.nextTick(cb) }

    let completed = 0
    let hasErrors = false
    function done(err) {
        if (err) {
            hasErrors = true
            return cb(err)
        }
        if (++completed === links.length && !hasErrors) {
            return cb()
        }
    }

    for (const link of links) {
        spider(link, maxDepth - 1, done)
    }
}
```

The core difference is when `spider()` for the next link starts.
#### In the sequential async iteration (comes form `iterate(index + 1)`):
- start `link 1`
- wait for `link 1` to finish 
- start `link 2`
- wait for `link 2` to finish 
- start `link 3`

```txt
spider(1) -> finishes
spider(2) -> finishes
spider(3) -> finishes
cb()
```

#### Concurrent async execution (comes from the for loop):
- start `link 1`
- start `link 2`
- start `link 3`
- then wait for all of them to finish

```txt
start spider(1)
start spider(2)
start spider(3)
whichever finishes calls done()
when all are done, cb()
```

### The pattern
```javascript
const tasks = [ /* ... */ ]
let completed = 0
for (const task of tasks) {
    task(() => {
        if (++completed === tasks.length) {
            finish()
        }
    })
}
fucntion finish() {
    // all the tasks completed
}
```

### Fixing race conditions with concurrent tasks
In a multithreaded environment, managing shared resources typically requires synchronization mechanisms such as locks, mutexes, semaphores, and monitors. These constructs help coordinate access to shared data but can introduce significant complexity and performance overhead.

In Node.js, we usually don't need a fancy synchronization mechanism, as everything runs on a single thread. However, this doesn't mean that we can't have race conditions. The root of the problem is the delay between the invocation of an asynchronous operation and the notification of its result.

#### Problem with `spider`
```javascript
export function spider(url, maxDepth, cb) {
    const filename = urlToFilename(url)
    exists(filename, (err, alreadyExists) => {
        // ...
        if (alreadyExists) {
            // ...
        } else {
            download(url, filename, (err, fileContent) => {
                // ...
            })
        }
    })
}
```
Two `spider` tasks operating on the same URL might invoke `exists()` on the same file before one of the two tasks completes the download and creates a file, causing both tasks to start a download. All we need to do to fix it is a **variable** to mutually exclude multiple `spider()` tasks running on the same URL.

```javascript
const spidering = new Set()

function spider(url, nesting, cb) {
    if (spidering.has(url)) {
        return process.nextTick(cb)
    }
    spidering.add(url)
    // ...
}
```

## 4) Limited Concurrent Execution

### Limiting concurrency
A pattern that will execute a set of given tasks concurrently with limited concurrency:
```javascript
const tasks = [ // ...
]

const concurrency = 2
let running = 0
let completed = 0
let nextTaskIndex = 0

function next() {
    while (running < concurrency && nextTaskIndex < tasks.length) {
        const tasks = tasks[nextTaskIndex++]
        task(() => {
            if (++completed === tasks.length) {
                return finish()
            }
            running--
            next()
        })
        running++
    }
}

next()

function finish() {
    // all the tasks completed
}
```
Here, because execution is always ordered within the event loop, `running` is always accurate, without the complexity of locks or race conditions.

### Globally limiting concurrency
We could apply the **limited concurrency** pattern to our `spiderLinks()` function. However, this would only limit the number of tasks for the links found on a single page. To fix this, we need to introduce a mechanism that allows us to control concurrency on a global level.

### Queues to the rescue
A good way to achieve this is by introducing queues to manage the concurrency of multiple tasks:
```javascript
export class TaskQueue {
    constructor(concurrency) {
        this.concurrency = concurrency
        this.running = 0
        this.queue = []
    }

    pushTask(task) {
        this.queue.push(task)
        process.nextTick(this.next.bind(this))
        return this
    }

    next() {
        while (this.running < this.concurrency && this.queue.length > 0) {
            const task = this.queue.shift()
            task(() => {
                this.running--
                process.nextTick(this.next.bind(this))
            })
            this.running++
        }
    }
}
```
- `pushTask()`: adds a new task to the queue and then bootstraps the execution of the worker by asynchronously invoking `this.next()`
- `next()`: spawns a set of tasks from the queue, ensuring that it does not exceed the concurrency limit

`TaskQueue` class allows us to **dynamically** add new items to the queue. So that now we have a central entity responsible for the limitation of the concurrency of the tasks.

### Refining the TaskQueue
Let's turn the `TaskQueue` into an `EventEmitter` so that we can emit events to propagate task failures:
```javascript
import { EventEmitter } from 'node:events'

export class TaskQueue extends EventEmitter {
    constructor (concurrency) {
        super()
        // ...
    }

    // ...

    next() {
        if (this.running === 0 && this.queue.length === 0) {
            return this.emit('empty')
        }
        
        while (this.running < this.concurrency && this.queue.length) {
            const task = this.queue.shift()
            task((err) => {
                if (err) { this.emit('error', err) }
                this.running--
                process.nextTick(this.next.bind(this))
            })
            this.running++
        }
    }
}
```