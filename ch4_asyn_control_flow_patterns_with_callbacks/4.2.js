/*
List files recursively: Write listNestedFiles(), a callback-style function that takes, 
as the input, the path to a directory in the local filesystem and that asynchronously 
iterates over all the subdirectories to eventually return a list of all the files discovered.
*/

import { readdir, stat } from "node:fs";

function listNestedFiles (dir, cb) {
    const output = []

    readdir(dir, (err, entries) => {
        if (err) {
            return cb(err)
        }

        function iterate(index) {
            if (index === entries.length) {
                return cb(null, output)
            }
            const entry = entries[index]
            const fullPath = dir + '/' + entry
            stat(fullPath, (err, stats) => {
                if (err) {
                    return cb(err)
                }
                if (stats.isFile()) {
                    output.push(fullPath)
                    iterate(index + 1)
                }
                if (stats.isDirectory()) {
                    listNestedFiles(fullPath, (err, childFiles) => {
                        if (err) {
                            return cb(err)
                        }
                        output.push(...childFiles)
                        iterate(index + 1)
                    })
                }
            })
        }

        iterate(0)
    })
}