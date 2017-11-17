
// EXPECTS INPUT FILE IN JSON FORMAT FROM REDCap version 7.4.10
// #!/bin/sh
// DATA="token=ADD TOKEN HERE&content=metadata&format=json&returnFormat=json&forms[0]=ADD FORM NAME"
// CURL=`which curl`
// $CURL -H "Content-Type: application/x-www-form-urlencoded" \
//       -H "Accept: application/json" \
//       -X POST \
//       -d $DATA \
//       http://ADD REAL REDCAP SERVER/redcap/api/
// var redcap_json = [
// {
//   "field_name": "phq8_1",
//   "form_name": "phq8",
//   "section_header": "Over the past two weeks, how often have you been bothered by any of the following problems ",
//   "field_type": "radio",
//   "field_label": "1. Little interest or pleasure in doing things?",
//   "select_choices_or_calculations": "0,Not at all|\r1,Several days|\r2,More than half the days|\r3,Nearly every day",
//   "field_note": "",
//   "text_validation_type_or_show_slider_number": "",
//   "text_validation_min": "",
//   "text_validation_max": "",
//   "identifier": "",
//   "branching_logic": "",
//   "required_field": "",
//   "custom_alignment": "",
//   "question_number": "",
//   "matrix_group_name": "phq8",
//   "matrix_ranking": "",
//   "field_annotation": ""
// }];


  function REDCapConvertor(redcap_json) {

    var self = this;

    this.splitChoices = function(rawContent){

      var arrayOfObjectsAndCodes = [];
     _.each(rawContent, function(value, key) {
        if(rawContent[key].select_choices_or_calculations && rawContent[key].select_choices_or_calculations.split) {

          var arrayOfObjectsAndCodes = [];

          rawContent[key].select_choices_or_calculations = rawContent[key].select_choices_or_calculations.split('|');

          _.each(rawContent[key].select_choices_or_calculations, function(value2,key2){
            arrayOfObjectsAndCodes.push({code:value2.split(",")[0], label:value2.split(",")[1]});
          })

          rawContent[key].select_choices_or_calculations = arrayOfObjectsAndCodes;
        }
      });
      return rawContent;
    };

    this.reformatBranchingLogic = function(branchingLogic){
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

    this.parseItemLogic = function(branchingLogicArray){
      var logicToEvaluate = '';
      var checkboxOrRadio = '';
      var checkboxValue = '';

      if (branchingLogicArray && branchingLogicArray.length > 0){
        _.each(branchingLogicArray, function(value2, key2){
          if (key2 % 4 === 0){
            if (value2.indexOf('(') === -1){
              checkboxOrRadio = 'radio';
            } else {
              checkboxOrRadio = 'checkbox';
              checkboxValue = value2.split('(')[1].split(')')[0];
            }
            logicToEvaluate += "responses['" + value2.split('(')[0] + "']";
          } else if (key2 % 4 === 2){
            //second variable
            switch (checkboxOrRadio){
              case 'radio':
                logicToEvaluate += '.indexOf(' + value2 + ') != -1';
                break;
              case 'checkbox':
                logicToEvaluate += '.indexOf(' + checkboxValue + ') != -1';
                break;
            }
          } else if (key2 % 4 === 3){
            //comparator
            if (value2 === 'or'){
              logicToEvaluate += ' || ';
            } else if (value2 === 'and'){
              logicToEvaluate += ' && ';

            }
          }
        });
      }
      return logicToEvaluate;
    };

    this.parseLogic = function (rawContent){
      _.each(rawContent, function(value, key) {

        rawContent[key].evaluated_logic =
          self.parseItemLogic(self.reformatBranchingLogic(rawContent[key].branching_logic));

      });

      return rawContent;
    };

    this.parseRedCap = function(redcap_json){
      return self.parseLogic(self.splitChoices(redcap_json));
    };

    this.evaluateLogic = function(branchingLogic){
      return eval(branchingLogic);
    };

    return this.parseRedCap(redcap_json);

  }
