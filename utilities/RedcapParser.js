var _ = require('underscore');

function REDCapConverter(redcap_json) {
  var self = this;
  this.splitChoices = function(rawContent) {
    var arrayOfObjectsAndCodes = [];
    _.each(rawContent, function(value, key) {
      if (
        rawContent[key].select_choices_or_calculations &&
        rawContent[key].select_choices_or_calculations.split
      ) {
        var arrayOfObjectsAndCodes = [];

        rawContent[key].select_choices_or_calculations = rawContent[
          key
        ].select_choices_or_calculations.split('|');

        _.each(rawContent[key].select_choices_or_calculations, function(
          value2,
          key2,
        ) {
          var values = value2.split(',');
          var finalLabel = values[1];

          // If the label itself contains further `,` chars select the rest of the string after the first
          // occurence of `,`
          if (values.length > 2) {
            var finalLabel = value2.substring(value2.indexOf(',') + 1);
          }
          arrayOfObjectsAndCodes.push({
            code: removeFirstWhiteSpace(values[0]),
            label: removeFirstWhiteSpace(finalLabel),
          });
        });
        rawContent[key].select_choices_or_calculations = arrayOfObjectsAndCodes;
      }
    });
    return rawContent;
  };

  this.reformatBranchingLogic = function(branchingLogic) {
    var formattedBranchingLogic = null;
    if (branchingLogic) {
      formattedBranchingLogic = branchingLogic
        .replace(/\[/g, '|')
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
              if (value2.includes('1')) {
                logicToEvaluate += ' == ' + checkboxValue;
              } else if (value2.includes('0')) {
                logicToEvaluate += ' != ' + checkboxValue;
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
  this.parseRadioOrRange = function(rawContent) {
    _.each(rawContent, function(value, key) {
      if (rawContent[key].field_type == 'radio') {
        if (rawContent[key].field_annotation.includes('range-type')) {
          rawContent[key].field_type = 'range';
        } else if (
          rawContent[key].field_annotation.includes('range-info-type')
        ) {
          rawContent[key].field_type = 'range-info';
        } else if (rawContent[key].field_annotation.includes('info-type')) {
          rawContent[key].field_type = 'info';
        } else if (
          rawContent[key].field_annotation.includes('matrix-radio-type')
        ) {
          rawContent[key].field_type = 'matrix-radio';
        }
      } else if (rawContent[key].field_type == 'text') {
        if (rawContent[key].field_annotation.includes('duration')) {
          rawContent[key].text_validation_type_or_show_slider_number =
            'duration';
        }
      }
    });

    return rawContent;
  };

  this.parseLogic = function(rawContent) {
    _.each(rawContent, function(value, key) {
      rawContent[key].evaluated_logic = self.parseItemLogic(
        self.reformatBranchingLogic(rawContent[key].branching_logic),
      );
    });
    rawContent = self.parseRadioOrRange(rawContent);
    return rawContent;
  };

  this.parseRedCap = function(redcap_json) {
    return self.parseLogic(self.splitChoices(redcap_json));
  };

  removeFirstWhiteSpace = function(val) {
    if (val) val = val.trim();
    if (val && val.substr(0, 1) === ' ') {
      return val.substr(1);
    }
    return val;
  };

  return this.parseRedCap(redcap_json);
}

module.exports = { REDCapConverter };
