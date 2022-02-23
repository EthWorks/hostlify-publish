const core = require('@actions/core');
const github = require('@actions/github');

try {
  const files = core.getInput('files')
  console.log(files)
  const id = core.getInput('id')
  console.log(id)
  const url = `${id}.truefipreview.io`
  core.setOutput("url", url)
  console.log("myurl " + url)
  // Get the JSON webhook payload for the event that triggered the workflow
//   const payload = JSON.stringify(github.context.payload, undefined, 2)
  console.log('files ', github.files)
  console.log('input ', github.getInput)
//   console.log(`The event payload: ${payload}`)
} catch (error) {
  core.setFailed(error.message)
}
