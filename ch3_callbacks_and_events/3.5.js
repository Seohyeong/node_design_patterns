/*
Create a function that accepts the path to a folder on the local file system 
and identifies the largest file within that folder. 
For extra credit, enhance the function to search recursively through subfolders. 
Hint: you can use the node:fs module for this task, specifically the stats() function 
to determine if a path is a directory or file and to get the file size in bytes, 
and the readdir() function to list the contents of a directory.”
*/
import { readdir, stat, readdirSync, statSync } from "node:fs";

function findLargestFileSync(dirPath) {
    const entries = readdirSync(dirPath)
    let largestFileSize = 0
    let largestFilePath = ''
    for (const entry of entries) {
        const fullPath = dirPath + '/' + entry
        const stats = statSync(fullPath)
        if (stats.isFile()) {
            if (stats.size > largestFileSize) {
                largestFileSize = stats.size
                largestFilePath = fullPath
            }
        }
    }
    return {largestFileSize, largestFilePath}
}

const { largestFileSize, largestFilePath } = findLargestFileSync('/Users/seohyeong/Projects/node_design_patterns/ch3')
console.log(largestFilePath)
console.log(largestFileSize)

function findLargestFile(dirPath, cb) {
    readdir(dirPath, (err, data) => {
        if (err) {
            return cb(err)
        }
        try {
            let largestFileSize = 0
            let largestFilePath = ''
            let total = 0
            for (const d of data) {
                const fullPath = dirPath + '/' + d
                stat(fullPath, (err, result) => {
                    if (err) {
                        return cb(err)
                    }
                    if (result.isFile()) {
                        if (result.size > largestFileSize) {
                            largestFileSize = result.size
                            largestFilePath = fullPath
                        }
                    }
                    total += 1
                    if (total === data.length) {
                        cb(null, {largestFileSize, largestFilePath})
                    }
                })
            }
        } catch (err) {
            return cb(err)
        }
    })
}

findLargestFile('/Users/seohyeong/Projects/node_design_patterns/ch3', (err, result) => {
        if (err) {
            console.log(err)
            return
        }
        console.log('done', result)
    })