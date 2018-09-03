source .env                                                                                                                                                                                                                                                                                                                                                                                                                       
node utilities/index.js $REDCAP_API_URL $DA_REDCAP_API_TOKEN $GITHUB_TOKEN aRMT $DA_LANG $GITHUB_REPO_OWNER $GITHUB_REPO_NAME $GITHUB_REPO_DIR
node utilities/index.js $REDCAP_API_URL $DE_REDCAP_API_TOKEN $GITHUB_TOKEN aRMT $DE_LANG $GITHUB_REPO_OWNER $GITHUB_REPO_NAME $GITHUB_REPO_DIR
node utilities/index.js $REDCAP_API_URL $EN_REDCAP_API_TOKEN $GITHUB_TOKEN aRMT '' $GITHUB_REPO_OWNER $GITHUB_REPO_NAME $GITHUB_REPO_DIR       # only seems to work with a literal for EN_LANG
node utilities/index.js $REDCAP_API_URL $ES_REDCAP_API_TOKEN $GITHUB_TOKEN aRMT $ES_LANG $GITHUB_REPO_OWNER $GITHUB_REPO_NAME $GITHUB_REPO_DIR 
node utilities/index.js $REDCAP_API_URL $IT_REDCAP_API_TOKEN $GITHUB_TOKEN aRMT $IT_LANG $GITHUB_REPO_OWNER $GITHUB_REPO_NAME $GITHUB_REPO_DIR 
node utilities/index.js $REDCAP_API_URL $NL_REDCAP_API_TOKEN $GITHUB_TOKEN aRMT $NL_LANG $GITHUB_REPO_OWNER $GITHUB_REPO_NAME $GITHUB_REPO_DIR
