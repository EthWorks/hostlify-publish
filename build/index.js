"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const core_1 = __importDefault(require("@actions/core"));
const github_1 = __importDefault(require("@actions/github"));
const axios_1 = __importDefault(require("axios"));
const octokit_1 = require("octokit");
function addFilesToBody(mainPath, body, serverPath) {
    fs_1.default.readdirSync(mainPath).forEach(fileOrFolderName => {
        const currentLocalPath = `${mainPath}/${fileOrFolderName}`;
        const currentServerPath = `${serverPath}/${fileOrFolderName}`;
        if (fs_1.default.lstatSync(currentLocalPath).isDirectory()) {
            body = addFilesToBody(currentLocalPath, body, currentServerPath);
        }
        else {
            const fileData = fs_1.default.readFileSync(currentLocalPath);
            const fileObject = {
                name: fileOrFolderName,
                data: fileData.toString(),
            };
            body[currentServerPath] = fileObject;
        }
    });
    return body;
}
async function sendFiles(mainPath, url, id) {
    const serverUrl = `http://${url}/upload/${id}`;
    const body = addFilesToBody(mainPath, {}, '.');
    const response = await axios_1.default.post(serverUrl, body, {
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
    });
    if (response.status !== 201) {
        throw new Error(`Server response status is ${response.status}`);
    }
}
async function addComment(commentContent) {
    const { owner, repo, accessToken, id, pullNumber } = await getInputs();
    const octokit = new octokit_1.Octokit({ auth: accessToken });
    const urlHtml = `:rocket: A preview build for ${id} was deployed to: <a href="http://${commentContent}" target="_blank">${commentContent}</a>`;
    await octokit.request('POST /repos/{owner}/{repo}/issues/{issue_number}/comments', {
        owner,
        repo,
        issue_number: pullNumber,
        body: urlHtml
    });
}
async function getInputs() {
    var _a;
    const id = github_1.default.context.sha.slice(0, 7);
    const files = core_1.default.getInput('files');
    const serverUrl = core_1.default.getInput('server-url');
    const repo = (_a = github_1.default.context.payload.repository) === null || _a === void 0 ? void 0 : _a.name;
    const owner = github_1.default.context.payload.organization.login.toString().toLowerCase();
    const accessToken = core_1.default.getInput('access-token');
    const pullNumber = github_1.default.context.payload.number;
    return {
        files,
        id,
        serverUrl,
        owner,
        repo,
        accessToken,
        pullNumber,
    };
}
async function run() {
    try {
        const { files, serverUrl, id } = await getInputs();
        const previewUrl = `${id}.${serverUrl}`;
        await sendFiles(files, serverUrl, id);
        core_1.default.setOutput('url', previewUrl);
        await addComment(previewUrl);
    }
    catch (error) {
        console.log(error);
        core_1.default.setFailed(error);
    }
}
(async () => {
    await run();
})();
