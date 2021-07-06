var _ = require('underscore');
var request = require('request');
var redcapParser = require('./RedcapParser');
var githubClient = require('./GithubClient');

async function publishQuestionnaires(
  redcap_url,
  redcap_token,
  type,
  langConvention,
  formNames,
) {
  for (const form of formNames) {
    await publishQuestionnaire(
      redcap_url,
      redcap_token,
      type,
      langConvention,
      form,
    );
    console.log('Done!');
  }
}

async function publishQuestionnaire(
  redcap_url,
  redcap_token,
  type,
  langConvention,
  form_name,
) {
  var lang = langConvention || '';
  var redcap_url = redcap_url || '';
  var redcap_token = redcap_token || '';
  var data = {
    token: redcap_token,
    content: 'metadata',
    format: 'json',
    returnFormat: 'json',
    'forms[0]': form_name,
  };

  await request.post({ url: redcap_url, form: data }, async function(
    err,
    httpResponse,
    body,
  ) {
    var redcap_json = JSON.parse(body.replace(/(\r?\n|\r)/gm, '\n'));
    var armt_json = redcapParser.REDCapConvertor(redcap_json);

    console.log('Updating: ' + form_name);

    // Publish to Github
    const githubFilename =
      form_name + '/' + form_name + '_armt' + lang + '.json';
    const formAsString = JSON.stringify(armt_json, null, 4);

    await githubClient
      .postToGithub(githubFilename, formAsString)
      .catch(e => console.log(e));

    console.log('Done!');
  });
}

var args = process.argv.slice(2);
publishQuestionnaires(
  args[0],
  args[1],
  args[2],
  args[3],
  args.slice(4, args.length),
);
