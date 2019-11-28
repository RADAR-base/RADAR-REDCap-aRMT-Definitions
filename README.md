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
5. To parse all single REDCap project `node utilties/index.js [REDCAP_API_URL] [REDCAP_API_TOKEN] [type] [LANGUAGE]`
6. To parse single form in a single REDCap project `node utilties/index.js [REDCAP_API_URL] [REDCAP_API_TOKEN] [type] [LANGUAGE] [FORM-NAME FORM-NAME]`

## aRMT

This is to be used to generate Questionnaire Definitions for the RADAR-base Active Remote Monitoring Application at [RADAR-Questionnaire](https://github.com/RADAR-base/RADAR-Questionnaire).
To generate this for different languages -
1. Copy the `utilities/_.env-template` to `./.env` and carefully fill in the values of the various variables specifically the Github Token and the branch.
2. Edit the `utilities/defaultGithubConfig.js` to add your Github Configuration for posting the data.
3. Run the `generateARMTs.sh` like `bash generateARMTs.sh`
4. To update only a specific questionnaire or form, run `bash generateARMTs.sh [FORM-NAME]`. For example: `bash generateARMTs.sh esm`
5. To update multiple questionnaires or forms, separate them by spaces: `bash generateARMTs.sh [FORM-NAME FORM-NAME]`. 

## Updating Process

We want to version both the REDCap Data Dictionaries and the derived aRMT Definitions Files.

The process should be:
1. Update the Data Dictionaries(DD) either directly or in the REDCap Test Project. Verify that these changes are correct.
2. Create a branch e.g. `dd-update-DATE` of Master in the relevant repository, add the new DDs overwriting the previous ones in `REDCap-DDs/` - you should strip the dates of the DD filenames or you'll end up with separate files, create a Pull Request
3. Set someone as a reviewer, get this approved then merged. The DDs are now versioned.
4. Update the production REDCap server projects with the new DDs, these changes are now ready to go live
5. The `node utilties/index.js` script can now be run to convert the aRMT DDs into aRMT Definitions, these are loaded onto github
6. A new protocol.json version number must now be incremented beforer the aRMT app will automatically pull the definintion changes them and start using them. Note however new registration/enrollments will automatically pickup latest configuration or configuration refresh can be triggered manually in the Questionnaire App settings https://radar-base.atlassian.net/browse/RSD-74
