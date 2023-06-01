var fs = require('fs');
const Ajv2020 = require('ajv/dist/2020');
const ajv = new Ajv2020();
const SCHEMA_URL = 'docs/definition-schema.json';
const schema = JSON.parse(fs.readFileSync(SCHEMA_URL, 'utf8'));

// Question input types whose logic expression values must not be quoted:
const TYPES_REQ_NOT_QUOTED = ['range', 'range-info', 'slider'];

// 1 Validate Schema
function validateSchema(definition) {
  const validate = ajv.compile(schema);
  const valid = validate(definition);
  if (!valid) {
    console.warn('Definition must follow the correct schema.');
    console.warn(validate.errors);
  }
  return valid;
}

// 2 Validate Branching Logic
function validateBranchingLogic(definition) {
  const fieldNames = definition.map(d => d.field_name);
  try {
    definition.forEach(a => {
      const logic = a.branching_logic;
      var keys = [];
      if (logic.length) keys = getLogicIdentifiers(logic);
      const valid =
        validateBranchingLogicKeys(keys, fieldNames) &&
        validateBranchingLogicValues(logic, keys, definition);
      if (!valid) {
        throw new Error('Validation error.');
      }
    });
  } catch (e) {
    return false;
  }
  return true;
}

// 2A Validate Branching Logic Keys
function validateBranchingLogicKeys(logicKeys, fieldNames) {
  // This will ensure keys present in the logic are actual field names of the questionnaire.
  const valid = logicKeys.every(key => fieldNames.includes(key));
  if (!valid) console.warn('Logic keys must match questionnaire field names.');
  return valid;
}

// 2B Validate Branching Logic Values
function validateBranchingLogicValues(logic, logicKeys, questions) {
  let valid = true;
  // This mostly checks quotes in branching logic values.
  logicKeys.forEach(a => {
    const type = getFieldTypeFromFieldName(questions, a);
    // Right operand of expression ="1"
    const rightOperand = logic.split(a)[1];
    const breakpoint = /\=|\<|\>|\<=|\>=|\<>/;
    // Remove equality or inequality symbols to get value
    const value = rightOperand.split(breakpoint)[1];
    // Get actual value enclosed in parentheses
    const valueRegex = /"[^"]*"|'[^"]*'/g;
    const finalValue = value.match(valueRegex);
    if (!finalValue) {
      // Value will be null if not in parenthesis
      if (!TYPES_REQ_NOT_QUOTED.includes(type)) {
        console.warn('WARN: Logic value must be in quotes for logic: ' + logic);
        valid = false;
      }
    } else {
      if (TYPES_REQ_NOT_QUOTED.includes(type)) {
        console.warn(
          'WARN: Logic value must not be in quotes for logic: ' + logic,
        );
        valid = false;
      }
    }
  });
  return valid;
}

function getFieldTypeFromFieldName(questions, fieldName) {
  return questions.find(q => q.field_name == fieldName).field_type;
}

function getLogicIdentifiers(logic) {
  const regex = /\[(.*?)\]/g;
  // This will remove the brackets around the field names and values in parentheses
  // e.g. [follow_med_current(6)] -> follow_med_current
  const keys = logic.match(regex);
  if (keys)
    return keys.map(
      a =>
        a
          .replace('[', '')
          .replace(']', '')
          .split('(')[0],
    );
  else return [];
}

/**
 *
 * MAIN VALIDATE FUNCTION
 */
function validate(definitionUrl) {
  const definition = JSON.parse(fs.readFileSync(definitionUrl, 'utf8'));
  // Validate definition against schema and branching logic specification
  return validateSchema(definition) && validateBranchingLogic(definition);
}

var questionnaireUrl = process.argv.slice(2)[0];
console.log(validate(questionnaireUrl));
