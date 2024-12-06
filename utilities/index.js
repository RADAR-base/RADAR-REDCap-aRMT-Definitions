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
    await publishSingleQuestionnaire(redcapUrl, langConvention, form, redcapToken);

    console.log(`Finished trying to publish questionnaire: ${form}`);
  }
}

async function publishSingleQuestionnaire(
  redcapUrl,
  langConvention,
  formName,
  redcapToken
) {
  var lang = langConvention || '';
  var redcapUrl = redcapUrl || '';

  // Publish to Github
  const githubFilename = formName + '/' + formName + '_armt' + lang + '.json';

  // Check form exists
  const formExists = await checkFormExists(redcapUrl, formName, redcapToken);
  if (!formExists) {
    console.log(`Form ${formName} does not exist in REDCap`);
    return;
  }
  else {
    console.log(`Form ${formName} exists in REDCap, pulling data...`);
    // If form exists, pull from REDCap
    const formAsString = await pullFromRedcap(redcapUrl, formName, redcapToken);
    console.log(`Pulled data for form ${formName}, publishing to Github...`);
    await githubClient
      .postToGithub(githubFilename, formAsString)
      .catch(e => console.log(e));
  }
}

function checkFormExists(redcapUrl, formName, redcapToken) {
  const formData = createFormRequestBody(redcapToken);
  formData.append('content', 'instrument');
  return sendPostRequest(redcapUrl, formData)
    .then(function(response) {
      const instruments = response['data'].map(instrument => instrument['instrument_name']);
      return instruments.includes(formName);
    })
    .catch(function(error) {
      console.log(error);
    });
}

function pullFromRedcap(redcapUrl, formName, redcapToken) {
  const formData = createFormRequestBody(redcapToken);
  formData.append('content', 'metadata');
  formData.append('forms[0]', formName);
  return sendPostRequest(redcapUrl, formData)
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

function sendPostRequest(url, form) {
  return axios.post(url, form, {
    headers: {
      'Content-Type': `multipart/form-data; boundary=${form._boundary}`,
    },
  });
}

function createFormRequestBody(redcapToken) {
  var form = new FormData();
  form.append('token', redcapToken);
  form.append('format', 'json');
  form.append('returnFormat', 'json');

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
