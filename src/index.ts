import fs from 'fs'

import core from '@actions/core'
import github from '@actions/github'
import axios from 'axios'
import { Octokit } from 'octokit'

import { Files, Inputs } from './types'

function addFilesToBody(mainPath: string, body: Files, serverPath: string) {
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
                data: fileData,
            }
            body[currentServerPath] = fileObject
        }
    })
    return body
}

async function sendFiles(mainPath: string, url: string, id: string) {
    const serverUrl = `http://${url}/upload/${id}`
    const body = addFilesToBody(mainPath, {}, '.')
    const response = await axios.post(serverUrl, body, { 
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
    })
    if(response.status !== 201) {
        throw new Error(`Server response status is ${response.status}`)
    }
}

async function addComment(commentContent: string) {
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

async function getInputs() {
    const id = github.context.sha.slice(0, 7)
    const files = core.getInput('files')
    const serverUrl = core.getInput('server-url')
    const repo = github.context.payload.repository?.name
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
    } as Inputs
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
        core.setFailed(error)
    }
}

(async () => {
    await run()
})()