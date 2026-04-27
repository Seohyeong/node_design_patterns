/*
Write recursiveFind(), a callback-style function that takes a path to a directory in the local filesystem and a keyword.
The function must find all the text files within the given directory that contain the given keyword in the file contents. 
The list of matching files should be returned using the callback when the search is completed. 
If no matching file is found, the callback must be invoked with an empty array.
*/

import { readFile, readdir, stat } from "node:fs";

function recursiveFind(dir, keyword, cb) {
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
            visitEntryWithKeyword(fullPath, keyword, (err, files) => {
                if (err) {
                    return cb(err)
                }
                output.push(...files)
                iterate(index + 1)
            })
        }

        iterate(0)
    })
}

function visitEntryWithKeyword(fullPath, keyword, cb) {
    stat(fullPath, (err, stats) => {
        if (err) {
            return cb(err)
        }
        if (stats.isFile()) {
            readFile(fullPath, 'utf8', (err, content) => {
                if (err) {
                    return cb(err)
                }
                if (content.includes(keyword)) {
                    return cb(null, [fullPath])
                } else {
                    return cb(null, [])
                }
            })
        }
        if (stats.isDirectory()) {
            recursiveFind(fullPath, keyword, (err, childFiles) => {
                if (err) {
                    return cb(err)
                }
                return cb(null, childFiles)
            })
        }
    })

}