const axios = require('axios');
var redcapParser = require('./RedcapParser');
var githubClient = require('./GithubClient');
var FormData = require('form-data');

async function publishQuestionnaires(
  redcapUrl,
  redcapToken,
  type,
  langConvention,
  formNames,
) {
  for (const form of formNames) {
    const formData = createFormRequestBody(redcapToken, form);
    await publishSingleQuestionnaire(redcapUrl, langConvention, form, formData);

    console.log(`Finished publishing questionnaire: ${form}`);
  }
}

async function publishSingleQuestionnaire(
  redcapUrl,
  langConvention,
  formName,
  formData,
) {
  var lang = langConvention || '';
  var redcapUrl = redcapUrl || '';

  // Publish to Github
  const githubFilename = formName + '/' + formName + '_armt' + lang + '.json';
  const formAsString = await pullFromRedcap(redcapUrl, formName, formData);

  await githubClient
    .postToGithub(githubFilename, formAsString)
    .catch(e => console.log(e));

  console.log('Done uploading to github!');
}

function pullFromRedcap(redcapUrl, formName, formData) {
  return axios({
    method: 'post',
    url: redcapUrl,
    data: formData,
    headers: {
      'Content-Type': `multipart/form-data; boundary=${formData._boundary}`,
    },
  })
    .then(function(response) {
      var formParsed = redcapParser.REDCapConverter(
        cleanupJson(response['data']),
      );
      const formAsString = JSON.stringify(formParsed, null, 4);
      return formAsString;
    })
    .catch(function(error) {
      console.log(error);
    });
}

function cleanupJson(json) {
  return JSON.parse(JSON.stringify(json).replace(/(\r?\n|\r)/gm, '\n'));
}

function createFormRequestBody(redcapToken, formName) {
  var form = new FormData();
  form.append('token', redcapToken);
  form.append('content', 'metadata');
  form.append('format', 'json');
  form.append('returnFormat', 'json');
  form.append('forms[0]', formName);

  return form;
}

var args = process.argv.slice(2);
publishQuestionnaires(
  args[0],
  args[1],
  args[2],
  args[3],
  args.slice(4, args.length),
);
