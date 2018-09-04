# RADAR-REDCap-aRMT-Definitions

This folder contains:
- REDCap Metadata Definition files for questionnaires used in the aRMT app
- aRMT reformatted payloads
- A REDCAP to aRMT convertor

## To use

1. Install node / npm
2. Clone this repository
3. Run `npm install`
4. Edit the `utilities/defaultGithubConfig.js` to add your Github Configuration for posting the data.
5. Run `node utilties/index.js [REDCAP API URL] [REDCAP API TOKEN] [type] [LANGUAGE]`


## aRMT

This is to be used to generate Questionnaire Definitions for the RADAR-base Active Remote Monitoring Application at [RADAR-Questionnaire](https://github.com/RADAR-base/RADAR-Questionnaire).
To generate this for different languages -
1. Copy the `utilities/_.env-template` to `./.env` and carefully fill in the values of the various variables specifically the Github Token and the branch.
2. Edit the `utilities/defaultGithubConfig.js` to add your Github Configuration for posting the data.
3. Run the `generateARMTs.sh` like `bash generateARMTs.sh`
