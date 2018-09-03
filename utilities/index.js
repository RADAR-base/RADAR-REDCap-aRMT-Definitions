var _ = require('underscore');
var request = require('request');
var GitHubApi = require('github');

function REDCapConvertor(redcap_json) {

    var self = this;
    this.splitChoices = function(rawContent) {

        var arrayOfObjectsAndCodes = [];
        _.each(rawContent, function(value, key) {
            if (rawContent[key].select_choices_or_calculations && rawContent[key].select_choices_or_calculations.split) {

                var arrayOfObjectsAndCodes = [];

                rawContent[key].select_choices_or_calculations = rawContent[key].select_choices_or_calculations.split('|');

                _.each(rawContent[key].select_choices_or_calculations, function(value2, key2) {
                    arrayOfObjectsAndCodes.push({
                        code: this.removeFirstWhiteSpace(value2.split(",")[0]),
                        label: this.removeFirstWhiteSpace(value2.split(",")[1])
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
        return formattedBranchingLogic
    };

    this.parseItemLogic = function(branchingLogicArray) {
        var logicToEvaluate = '';
        var checkboxOrRadio = '';
        var checkboxValue = '';

        if (branchingLogicArray && branchingLogicArray.length > 0) {
            _.each(branchingLogicArray, function(value2, key2) {
                if (key2 % 4 === 0) {
                    if (value2.indexOf('(') === -1) {
                        checkboxOrRadio = 'radio';
                    } else {
                        checkboxOrRadio = 'checkbox';
                        checkboxValue = value2.split('(')[1].split(')')[0];
                    }
                    logicToEvaluate += "responses['" + value2.split('(')[0] + "']";
                } else if (key2 % 4 === 2) {
                    //second variable
                    switch (checkboxOrRadio) {
                        case 'radio':
                            logicToEvaluate += value2 + ' != 0';
                            break;
                        case 'checkbox':
                            logicToEvaluate += checkboxValue + ' != 0';
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

    this.parseLogic = function(rawContent) {
        _.each(rawContent, function(value, key) {
            rawContent[key].evaluated_logic =
                self.parseItemLogic(self.reformatBranchingLogic(rawContent[key].branching_logic));
        });

        return rawContent;
    };

    this.parseRedCap = function(redcap_json) {
        return self.parseLogic(self.splitChoices(redcap_json));
    };


    this.removeFirstWhiteSpace = function(val) {
      if(val.substr(0,1) === ' '){
        return val.substr(1)
      }
      return val
    };


    return this.parseRedCap(redcap_json);

}

function postToGitHub (github_token, filename, file_content, github_repo_owner, github_repo_name, github_repo_dir) {

  var github = new GitHubApi()

 try{
  github.authenticate({
    type: 'oauth',
    token: github_token
  })

  var github_details = {
      owner: github_repo_owner,
      repo: github_repo_name,
      path: github_repo_dir + '/' + filename
  };

  var post_details = {
    owner: github_details.owner, repo:github_details.repo, path:github_details.path , message:'Update Questionnaire ' + filename, content: new Buffer(file_content).toString('base64')
  }

  github.repos.getContent({
    owner: github_details.owner,
    repo: github_details.repo,
    path: github_details.path
  }, function(status,data){
    if(data !== undefined){
        console.log('Updating existing file on Github: ' + filename)
        post_details.sha = data.data.sha;
        github.repos.updateFile(post_details);
    } else {
        console.log('Creating new file on Github: ' + filename)
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

function preparePostToGithub(form_name, form, lang, github_token, github_repo_owner, github_repo_name, github_repo_dir) {
  console.log(lang + ' ' + form_name)
  postToGitHub(github_token,
    form_name + "/"+ form_name + "_armt" + lang + ".json",
    JSON.stringify(form,null,4), github_repo_owner, github_repo_name, github_repo_dir
  );
}

function postRADARJSON(redcap_url, redcap_token, github_token, type, langConvention, github_repo_owner, github_repo_name, github_repo_dir) {
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
      var redcap_json = JSON.parse(body.replace(/(\r?\n|\r)/gm, "\n"));
      var armt_json = REDCapConvertor(redcap_json);

      var redcap_json_questionnaires = splitIntoQuestionnaires(redcap_json)
      var armt_json_questionnaires = splitIntoQuestionnaires(armt_json)

      form_names = Object.keys(armt_json_questionnaires)

      setInterval(function() {
        form_name = form_names[globalItter]
        form_armt = armt_json_questionnaires[form_name]
        form_redcap = redcap_json_questionnaires[form_name]
        switch(type) {
          case 'redcap': preparePostToGithub(form_name, form_redcap, lang, github_token, github_repo_owner, github_repo_name, github_repo_dir)

          default: preparePostToGithub(form_name, form_armt, lang, github_token, github_repo_owner, github_repo_name, github_repo_dir)
          break;
        }
        globalItter += 1
        if (globalItter == form_names.length) {
          // Wait further 2000ms for asynchronous tasks to be completed
          new Promise(resolve => setTimeout(resolve, 1500)).then(() => { process.exit()});
        }
      }, 3000)
    });
}

var globalItter = 0
var args = process.argv.slice(2);
postRADARJSON(args[0], args[1], args[2], args[3], args[4], args[5], args[6], args[7]);
