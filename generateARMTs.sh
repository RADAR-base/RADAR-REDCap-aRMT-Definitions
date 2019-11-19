source .env
node utilities/index.js $REDCAP_API_URL $DA_REDCAP_API_TOKEN  aRMT $DA_LANG $1
node utilities/index.js $REDCAP_API_URL $DE_REDCAP_API_TOKEN  aRMT $DE_LANG $1
node utilities/index.js $REDCAP_API_URL $EN_REDCAP_API_TOKEN  aRMT '' $1 # only seems to work with a literal for EN_LANG
node utilities/index.js $REDCAP_API_URL $ES_REDCAP_API_TOKEN  aRMT $ES_LANG $1
node utilities/index.js $REDCAP_API_URL $IT_REDCAP_API_TOKEN  aRMT $IT_LANG $1
node utilities/index.js $REDCAP_API_URL $NL_REDCAP_API_TOKEN  aRMT $NL_LANG $1
