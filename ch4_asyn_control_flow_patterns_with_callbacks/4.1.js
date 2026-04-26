/*
Write the implementation of concatFiles(), a callback-style function 
that takes two or more paths to text files in the filesystem and a destination file.

This function must copy the contents of every source file into the destination file, 
respecting the order of the files, as provided by the arguments list. 
For instance, given two files, if the first file contains foo and the second file contains bar, 
the function should write foobar (and not barfoo) in the destination file.
*/

import { readFile, writeFile } from "node:fs";

function concatFiles(filePaths, destFile, cb) {
    let content = ''
    const total = filePaths.length
    
    function iterate(idx) {
        if (idx === total) {
            writeFile(destFile, content, (err) => {
                if (err) { return cb(err) }
                return cb(null)
            })
            return
        }

        const filePath = filePaths[idx]
        readFile(filePath, 'utf8', (err, data) => {
            if (err) { return cb(err) }
            content += data
            iterate(idx + 1)
        })

    }

    iterate(0)
}

concatFiles(
    [
        './ch4_asyn_control_flow_patterns_with_callbacks/tests/sydney.txt',
        './ch4_asyn_control_flow_patterns_with_callbacks/tests/world.txt',
        './ch4_asyn_control_flow_patterns_with_callbacks/tests/hello.txt'
      ],
      './ch4_asyn_control_flow_patterns_with_callbacks/tests/output.txt',
    (err) => { 
        if (err) { 
            console.error(err)
            return
        }
        console.log('done')
    }
)