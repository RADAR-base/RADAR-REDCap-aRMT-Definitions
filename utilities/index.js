var _ = require('underscore');
var request = require('request');
var GitHubApi = require('github');
var defaultGithubConfig = require('./defaultGithubConfig')

function REDCapConvertor(redcap_json) {

    var self = this;
    this.splitChoices = function(rawContent) {

        var arrayOfObjectsAndCodes = [];
        _.each(rawContent, function(value, key) {
            if (rawContent[key].select_choices_or_calculations && rawContent[key].select_choices_or_calculations.split) {

                var arrayOfObjectsAndCodes = [];

                rawContent[key].select_choices_or_calculations = rawContent[key].select_choices_or_calculations.split('|');

                _.each(rawContent[key].select_choices_or_calculations, function(value2, key2) {
                  var values = value2.split(",")
                  var finalLabel = values[1]

                  // If the label itself contains further `,` chars select the rest of the string after the first
                  // occurence of `,`
                  if(values.length > 2) {
                    var finalLabel = value2.substring(value2.indexOf(",") + 1)
                  }
                    arrayOfObjectsAndCodes.push({
                        code: this.removeFirstWhiteSpace(values[0]),
                        label: this.removeFirstWhiteSpace(finalLabel)
                    });
                })
                rawContent[key].select_choices_or_calculations = arrayOfObjectsAndCodes;
            }
        });
        return rawContent;
    };

    this.reformatBranchingLogic = function(branchingLogic) {
        var formattedBranchingLogic = null;
        if (branchingLogic) {
            formattedBranchingLogic =
                branchingLogic.replace(/\[/g, '|')
                .replace(/\]/g, '|')
                .replace(/=/g, '==|')
                .replace(/ or /g, '|or')
                .replace(/ and /g, '|and')
                .replace(/<>/g, '!=|')
                .split('|')
                .splice(1);
        }
        return formattedBranchingLogic;
    };

    this.parseItemLogic = function(branchingLogicArray) {
        var logicToEvaluate = '';
        var checkboxOrRadio = '';
        var checkboxValue = '';

        if (branchingLogicArray && branchingLogicArray.length > 0) {
            _.each(branchingLogicArray, function(value2, key2) {
              // Eg- If the branching logic is - "[esm_social_interact(1)] = "1" or [esm_social_interact(2)] = "0"
              //console.log('value : ' + value2 + 'key : ' + key2)
                if (key2 % 4 === 0) {
                  // This mod will select the values like esm_social_interact(1), esm_social_interact(2)
                  // from the above example
                    if (value2.indexOf('(') === -1) {
                        checkboxOrRadio = 'radio';
                    } else {
                        checkboxOrRadio = 'checkbox';
                        checkboxValue = value2.split('(')[1].split(')')[0];
                    }
                    logicToEvaluate += "responses['" + value2.split('(')[0] + "']";
                } else if (key2 % 4 === 2) {
                    //second variable
                    // This mod will select the "1", "0" vaules from the above example
                    switch (checkboxOrRadio) {
                      // question[i] = 1 in RedCap maps to question = i in aRMT
                      // question[i] = 0 in RedCap maps to question != i in aRMT
                        case 'radio':
                            logicToEvaluate += ' == ' + value2;
                            break;
                        case 'checkbox':
                            if (value2.includes("1")) {
                              logicToEvaluate += ' == ' + checkboxValue
                            } else if(value2.includes("0")) {
                              logicToEvaluate += ' != ' + checkboxValue
                            }
                            break;
                    }
                } else if (key2 % 4 === 3) {
                    //comparator
                    if (value2 === 'or') {
                        logicToEvaluate += ' || ';
                    } else if (value2 === 'and') {
                        logicToEvaluate += ' && ';

                    }
                }
            });
        }
        return logicToEvaluate;
    };

    // Change the radio to range if specified in the field_annotation in Redcap Metadata
    // This changes the appearance of buttons on the UI in aRMT
    this.parseRadioOrRange = function(rawContent){
      _.each(rawContent, function(value, key) {
        if(rawContent[key].field_type == 'radio') {
          if(rawContent[key].field_annotation.includes('range-type')) {
            rawContent[key].field_type = 'range'
          } else if(rawContent[key].field_annotation.includes('range-info-type')) {
            rawContent[key].field_type = 'range-info'
          }
        } else if(rawContent[key].field_type == 'text') {
            if(rawContent[key].field_annotation.includes('duration')) {
              rawContent[key].text_validation_type_or_show_slider_number = 'duration'
            }
        }
      });

      return rawContent;
    };

    this.parseLogic = function(rawContent) {
        _.each(rawContent, function(value, key) {
            rawContent[key].evaluated_logic =
                self.parseItemLogic(self.reformatBranchingLogic(rawContent[key].branching_logic));
        });
        rawContent = self.parseRadioOrRange(rawContent);
        return rawContent;
    };



    this.parseRedCap = function(redcap_json) {
        return self.parseLogic(self.splitChoices(redcap_json));
    };


    this.removeFirstWhiteSpace = function(val) {
      if(val.substr(0,1) === ' '){
        return val.substr(1);
      }
      return val;
    };


    return this.parseRedCap(redcap_json);

}

function postToGitHub (filename, file_content) {

  var github = new GitHubApi();

 try {
  github.authenticate({
    type: 'oauth',
    token: defaultGithubConfig.GITHUB_TOKEN
  })

  var github_details = {
      owner: defaultGithubConfig.GITHUB_REPO_OWNER,
      repo: defaultGithubConfig.GITHUB_REPO_NAME,
      path: defaultGithubConfig.GITHUB_REPO_DIR + '/' + filename,
      branch: defaultGithubConfig.GITHUB_REPO_BRANCH
  };

  var post_details = {
     owner: github_details.owner, repo: github_details.repo, path: github_details.path , message: 'Update Questionnaire ' + filename,
     content: Buffer.from(file_content).toString('base64'), branch: github_details.branch
  }

  github.repos.getContent({
    owner: github_details.owner,
    repo: github_details.repo,
    path: github_details.path,
    ref: github_details.branch
  }, function(status,data){
    console.log("Status: " + status + ", DATA: " + data + ", Path: ", github_details.path)
    if(data !== undefined){
        console.log('Updating existing file on Github: ' + filename + ' on Branch: ' + github_details.branch)
        post_details.sha = data.data.sha;
        github.repos.updateFile(post_details);
    } else {
        console.log('Creating new file on Github: ' + filename + ' on Branch: ' + github_details.branch)
        github.repos.createFile(post_details);
    }
  });
} catch(error) {
  console.error(error);
}

}

function splitIntoQuestionnaires(armt_json) {
  questionnaires = {}
  for(var i = 0; i < armt_json.length; i++) {
    try {
        questionnaires[armt_json[i]['form_name']].push(armt_json[i])

    } catch(e) {
      questionnaires[armt_json[i]['form_name']] = [armt_json[i]]
    }
  }
  return questionnaires
}

function preparePostToGithub(form_name, form, lang) {
  console.log(lang + ' ' + form_name);
  postToGitHub(
    form_name + "/"+ form_name + "_armt" + lang + ".json",
    JSON.stringify(form, null, 4)
  );
}

function postRADARJSON(redcap_url, redcap_token, type, langConvention, formNames) {
    var lang = langConvention || '';
    var redcap_url = redcap_url || '';
    var redcap_token = redcap_token || '';
    var redcap_form_name = redcap_form_name || '';
    var post_form = {
        token: redcap_token,
        content: 'metadata',
        format: 'json',
        returnFormat: 'json',
        forms: [redcap_form_name]
    };

    request.post({url:redcap_url, form: post_form}, function(err,httpResponse,body){
      var redcap_json = JSON.parse(body.replace(/(\r?\n|\r)/gm, '\n'));
      var armt_json = REDCapConvertor(redcap_json);

      var redcap_json_questionnaires = splitIntoQuestionnaires(redcap_json);
      var armt_json_questionnaires = splitIntoQuestionnaires(armt_json);

      // Filter specified forms to update on Github
      form_names = Object.keys(armt_json_questionnaires);
      form_names = formNames.length
        ? form_names.filter(v => formNames.includes(v))
        : form_names;

      console.log("Updating: " + form_names);  
      
      setInterval(function() {
        if (globalItter == form_names.length) {
          // Wait further 1500ms for asynchronous tasks to be completed
          new Promise(resolve => setTimeout(resolve, 1500)).then(() => { process.exit()});
          return;
        }

        form_name = form_names[globalItter];
        form_armt = armt_json_questionnaires[form_name];
        form_redcap = redcap_json_questionnaires[form_name];

        // Remove if record_id field autogenerated by redcap exists
        if(form_armt[0].field_name == 'record_id') 
          form_armt.splice(0,1);

        switch(type) {
          case 'redcap': preparePostToGithub(form_name, form_redcap, lang);

          default: preparePostToGithub(form_name, form_armt, lang);
          break;
        }
        globalItter += 1;
      }, 3000)
    });
}

var globalItter = 0;
var args = process.argv.slice(2);
postRADARJSON(args[0], args[1], args[2], args[3], args.slice(4, args.length));
