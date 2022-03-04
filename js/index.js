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
                data: fileData
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
    await axios.post(serverUrl, body, { 
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
    }, (err) => {
        if(err) {
            console.log(err)
        }
    })
}

async function getComments() {
    const { owner, repo, accessToken, pullNumber } = await getInputs()
    const octokit = new Octokit({ auth: accessToken})
    const comments = await octokit.request('GET /repos/{owner}/{repo}/issues/{issue_number}/comments', {
        owner,
        repo,
        issue_number: pullNumber
    })
    return comments
}

async function getPreviewCommentId() {
    const comments = await getComments()
    const commentRegex = `:rocket: A preview build for`
    for(const comment of comments.data) {
        if(comment.body.includes(commentRegex)) {
            return comment.id
        }
    }
    return undefined
}

async function addComment(commentContent) {
    const { owner, repo, accessToken, id, pullNumber } = await getInputs()
    const octokit = new Octokit({ auth: accessToken})
    const urlHtml = `:rocket: A preview build for ${id} was deployed to: <a href="http://${commentContent}" target="_blank">${commentContent}</a>`
    await octokit.request('POST /repos/{owner}/{repo}/issues/{issue_number}/comments', {
        owner,
        repo,
        issue_number: pullNumber,
        body: urlHtml
    })
}

async function updateComment(commentId, commentContent) {
    const { owner, repo, accessToken, id } = await getInputs()
    const octokit = new Octokit({ auth: accessToken})
    const urlHtml = `:rocket: A preview build for ${id} was deployed to: <a href="http://${commentContent}" target="_blank">${commentContent}</a>`
    await octokit.request('PATCH /repos/{owner}/{repo}/issues/comments/{comment_id}', {
        owner,
        repo,
        comment_id: commentId,
        body: urlHtml
    })
}

async function getInputs() {
    const id = github.context.payload.after.slice(0, 7)
    const files = core.getInput('files')
    const serverUrl = core.getInput('server-url')
    const repo = github.context.payload.repository.name
    const owner = github.context.payload.organization.login.toString().toLowerCase()
    const accessToken = core.getInput('access-token')
    const pullNumber = github.context.payload.number


    return {
        files,
        id,
        serverUrl,
        owner,
        repo,
        accessToken,
        pullNumber,
    }
}

async function run() {
    try {
    const { files, serverUrl, id } = await getInputs()
    const previewUrl = `${id}.${serverUrl}`
    await sendFiles(files, serverUrl, id)
    core.setOutput('url', previewUrl)
    const commentId = await getPreviewCommentId()
    commentId ? (await updateComment(commentId, previewUrl)) : (await addComment(previewUrl))
    } catch (error) {
        console.log(error)
        core.setFailed(error.message)
    }
}

(async () => {
    await run()
})()
