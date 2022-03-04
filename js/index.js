const core = require('@actions/core')
const github = require('@actions/github')
const fs = require('fs')
const axios = require('axios')
const { Octokit } = require('octokit')

const commentBegining = `:money_with_wings: A preview build for`

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

async function sendFiles() {
    const { files, id, serverUrl: url } = await getContext()
    const serverUrl = `http://${url}/upload/${id}`
    let body = {}
    body = addFilesToBody(files, body, '.')
    await axios.post(serverUrl, body, { 
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
    }, (err) => {
        if(err) {
            console.log(err)
        }
    })
}

async function deletePreviousPreview() {
    const { previousId, serverUrl: url } = await getContext()
    const serverUrl = `http://${url}/${previousId}`

    await axios.delete(serverUrl, (err) => {
        if(err) {
            console.log(err)
        }
    })
}

async function getCommitsInPR() {    
    const { owner, repo, accessToken, pullNumber } = getInputs()
    const octokit = new Octokit({ auth: accessToken})
    const commits = await octokit.request('GET /repos/{owner}/{repo}/pulls/{pull_number}/commits', {
        owner,
        repo,
        pull_number: pullNumber
    })
    return commits
}

async function getComments() {
    const { owner, repo, accessToken, pullNumber } =  getInputs()
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
    for(const comment of comments.data) {
        if(comment.body.includes(commentBegining)) {
            return comment.id
        }
    }
    return undefined
}

async function getCurrentCommitSha() {
    const commits = await getCommitsInPR()
    const currentCommit = commits.data.pop()

    return currentCommit.sha
}

async function getPreviousCommitSha() {
    const commits = await getCommitsInPR()
    const previousCommit = commits.data[commits.data.length - 2]

    return previousCommit.sha
}

async function addComment() {
    const { owner, repo, octokit, pullNumber, urlHtml } = await getContext()
    await octokit.request('POST /repos/{owner}/{repo}/issues/{issue_number}/comments', {
        owner,
        repo,
        issue_number: pullNumber,
        body: urlHtml
    })
}

async function updateComment() {
    const { commentId, owner, repo, octokit, urlHtml } = await getContext()
    await octokit.request('PATCH /repos/{owner}/{repo}/issues/comments/{comment_id}', {
        owner,
        repo,
        comment_id: commentId,
        body: urlHtml
    })
}

function getInputs() {
    const files = core.getInput('files')
    const serverUrl = core.getInput('server-url')
    const repo = github.context.payload.repository.name
    const owner = github.context.payload.organization.login.toString().toLowerCase()
    const accessToken = core.getInput('access-token')
    const pullNumber = github.context.payload.number

    return {
        files,
        serverUrl,
        owner,
        repo,
        accessToken,
        pullNumber,
    }
}

async function getContext() {
    const { accessToken, serverUrl, files, owner, repo, pullNumber } = getInputs()
    const octokit = new Octokit({ auth: accessToken})
    const commitId = await getCurrentCommitSha()
    const id = commitId.slice(0, 7)
    const previousCommitId = await getPreviousCommitSha()
    const previousId = previousCommitId.slice(0, 7)
    const commentId = await getPreviewCommentId()
    const previewUrl = `${id}.${serverUrl}`
    const urlHtml = `${commentBegining} ${id} was deployed to: <a href="http://${previewUrl}" target="_blank">${previewUrl}</a>`

    return {
        accessToken,
        id,
        commentId,
        files,
        octokit,
        owner,
        previewUrl,
        previousId,
        pullNumber,
        repo,
        serverUrl,
        urlHtml,
    }
}

async function run() {
    try {
        const { previewUrl, previousId } = await getContext()
        await sendFiles()
        const commentId = await getPreviewCommentId()
        commentId ? (await updateComment()) : (await addComment())
        previousId ? (await deletePreviousPreview()) : undefined
        core.setOutput('url', previewUrl)
    } catch (error) {
        console.log(error)
        core.setFailed(error.message)
    }
}

(async () => {
    await run()
})()
