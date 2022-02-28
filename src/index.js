const core = require('@actions/core')
const github = require('@actions/github')
const fs = require('fs')
const axios = require('axios')
const { Octokit } = require('octokit')

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

// async function getPRNumber() {
//     const { owner, repo, id } = getInputs()
//     const commitSha = 
//     await octokit.request('GET /repos/{owner}/{repo}/commits/{commit_sha}/pulls', {
//         owner,
//         repo,
//         commit_sha: id
//       })}

async function addComment(commentContent) {
    const { owner, repo, pullNumber, accessToken } = getInputs()
    const octokit = new Octokit({ auth: accessToken})
    const urlHtml = `<a href="http://${commentContent}">${commentContent + " " + github}</a>`
    await octokit.request('POST /repos/{owner}/{repo}/issues/{issue_number}/comments', {
        owner,
        repo,
        issue_number: pullNumber,
        body: urlHtml
    })
}

function getInputs() {
    const files = core.getInput('files')
    const id = core.getInput('id')
    const serverUrl = core.getInput('server-url')
    const owner = core.getInput('owner')
    const repo = core.getInput('repo')
    const pullNumber = core.getInput('pull_number')
    const accessToken = core.getInput('access-token')

    return {
        files,
        id,
        serverUrl,
        owner,
        repo,
        pullNumber,
        accessToken
    }
}

async function run() {
    try {
    const { files, id, serverUrl } = getInputs()
    const previewUrl = `${id}.${serverUrl}`
    sendFiles(files, serverUrl, id)
    core.setOutput('url', previewUrl)
    await addComment(previewUrl)
    } catch (error) {
        console.log(error)
        core.setFailed(error.message)
    }
}

(async () => {
    await run()
})();