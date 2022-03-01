import { getInput, setOutput, setFailed } from '@actions/core'
import { context } from '@actions/github'
import { readdirSync, lstatSync, readFileSync } from 'fs'
import { post } from 'axios'
import { Octokit } from 'octokit'

async function sendFile(fileObject, currentServerPath, serverUrl) {
    const body = {}
    body[currentServerPath] = fileObject
    await post(serverUrl, body, (err) => {
        if(err) {
            console.log(err)
        }
    })
}

async function sendSingleFiles(mainPath, serverPath, serverUrl) {
    readdirSync(mainPath).forEach(fileOrFolderName => {
        const currentLocalPath = `${mainPath}/${fileOrFolderName}`
        const currentServerPath = `${serverPath}/${fileOrFolderName}`
        if(lstatSync(currentLocalPath).isDirectory()) {
            await sendSingleFiles(currentLocalPath, currentServerPath, serverUrl)
        }
        else {
            const fileData = readFileSync(currentLocalPath)
            const fileObject = {
                name: fileOrFolderName,
                data: fileData.toString()
            }
            await sendFile(fileObject, currentServerPath, serverUrl)
        }
    })
}

async function sendFiles(mainPath, url, id) {
    const serverUrl = `http://${url}/upload/${id}`
    await sendSingleFiles(mainPath, '.', serverUrl)
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
    const urlHtml = `:rocket: A preview build for ${id} was deployed to: <a href="http://${commentContent}">${commentContent}</a>`
    const issue_number = await getPRNumber()
    await octokit.request('POST /repos/{owner}/{repo}/issues/{issue_number}/comments', {
        owner,
        repo,
        issue_number,
        body: urlHtml
    })
}

async function getInputs() {
    const id = context.sha.slice(0, 7)
    const files = getInput('files')
    const serverUrl = getInput('server-url')
    const owner = getInput('owner')
    const repo = getInput('repo')
    const accessToken = getInput('access-token')

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
    setOutput('url', previewUrl)
    await addComment(previewUrl)
    } catch (error) {
        console.log(error)
        setFailed(error.message)
    }
}

(async () => {
    await run()
})();