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

async function sendFiles(mainPath, url, id) {
    const serverUrl = `http://${url}/upload/${id}`
    let body = {}
    body = addFilesToBody(mainPath, body, '.')
    await axios.post(serverUrl, body, (err) => {
        if(err) {
            console.log(err)
        }
    })
}

async function getPRNumber() {
    const { owner, repo, id, accessToken } = await getInputs()
    const octokit = new Octokit({ auth: accessToken})
    const commits =  await octokit.request('GET /repos/{owner}/{repo}/commits/{commit_sha}/pulls', {
        owner,
        repo,
        commit_sha: id
    })
    return commits.data[0].number
}

async function addComment(commentContent) {
    const { owner, repo, accessToken, id } = await getInputs()
    const octokit = new Octokit({ auth: accessToken})
    const urlHtml = `:rocket: A preview build for ${id} was deployed to:</br><a href="http://${commentContent}">${commentContent}</a>`
    const issue_number = await getPRNumber()
    await octokit.request('POST /repos/{owner}/{repo}/issues/{issue_number}/comments', {
        owner,
        repo,
        issue_number,
        body: urlHtml
    })
}

async function getInputs() {
    const id = github.context.sha.slice(0, 7)
    const files = core.getInput('files')
    const serverUrl = core.getInput('server-url')
    const owner = core.getInput('owner')
    const repo = core.getInput('repo')
    const accessToken = core.getInput('access-token')

    return {
        files,
        id,
        serverUrl,
        owner,
        repo,
        accessToken
    }
}

async function run() {
    try {
    const { files, serverUrl, id } = await getInputs()
    const previewUrl = `${id}.${serverUrl}`
    await sendFiles(files, serverUrl, id)
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