const core = require('@actions/core')
const fs = require('fs')
const axios = require('axios')

function addFilesToBody(mainPath, body, serverPath) {
    fs.readdirSync(mainPath).forEach(fileOrFolderName => {
        const currentLocalPath = `${mainPath}/${fileOrFolderName}`
        const currentServerPath = `${serverPath}/${fileOrFolderName}`
        if(fs.lstatSync(currentLocalPath).isDirectory()) {
            body = addFilesToBody(currentLocalPath, body, currentServerPath)
        }
        else {
            const fileData = fs.readFileSync(currentLocalPath)
            const fileObject = {
                name: fileOrFolderName,
                data: fileData.toString()
            }
            body[currentServerPath] = fileObject
        }
    })
    return body
}

function sendFiles(mainPath, url, id) {
    const serverUrl = `http://${url}/upload/${id}`
    let body = {}
    body = addFilesToBody(mainPath, body, '.')
    axios.post(serverUrl, body, (err) => {
        if(err) {
            console.log(err)
        }
    })
}

try {
  const files = core.getInput('files')
  const id = core.getInput('id')
  const serverUrl = core.getInput('server-url')
  const previewUrl = `${id}.${serverUrl}`
  sendFiles(files, serverUrl, id)
  core.setOutput('url', previewUrl)
} catch (error) {
    console.log(error)
    core.setFailed(error.message)
}
