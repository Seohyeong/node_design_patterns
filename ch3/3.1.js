/*
Modify the asynchronous FindRegex class so that it emits an event when the find process starts, 
passing the input files list as an argument.
*/

import { EventEmitter } from "node:events";
import { readFile } from "node:fs";

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

    brokenFind() {
        this.emit('start', this.files)
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

    find() {
        const currentFiles = [...this.files]
        process.nextTick(() => this.emit('start', currentFiles))
        for (const file of currentFiles) {
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

// find()
const finder = new FindRegex(/hello/g)
    .addFile('file1.txt')
    .addFile('file2.txt')

finder.find().on('start', (files) => {
    console.log('start fired with:', files)
})

finder.on('fileread', (file) => {
    console.log('read:', file)
})
  
finder.on('found', (file, match) => {
    console.log('found:', match, 'in', file)
})

finder.on('error', (err) => {
    console.error(err)
})

// brokenFind()
const brokenFinder = new FindRegex(/hello/g)
    .addFile('file1.txt')
    .addFile('file2.txt')

brokenFinder.brokenFind().on('start', (files) => {
    console.log('start fired with:', files)
})

brokenFinder.on('fileread', (file) => {
    console.log('read:', file)
})
  
brokenFinder.on('found', (file, match) => {
    console.log('found:', match, 'in', file)
})

brokenFinder.on('error', (err) => {
    console.error(err)
})