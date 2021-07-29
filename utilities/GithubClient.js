const { Octokit } = require('@octokit/rest');
var defaultGithubConfig = require('./defaultGithubConfig');

const owner = defaultGithubConfig.GITHUB_REPO_OWNER,
  repo = defaultGithubConfig.GITHUB_REPO_NAME,
  branch = defaultGithubConfig.GITHUB_REPO_BRANCH,
  ref = 'heads/' + branch;

const github = new Octokit({
  auth: defaultGithubConfig.GITHUB_TOKEN,
});

// Create a single-file commit on top of head.
async function postToGithub(fileName, content) {
  var path = defaultGithubConfig.GITHUB_REPO_DIR + '/' + fileName;

  // 1. Get the sha of the last commit
  var {
    data: { object },
  } = await github.git.getRef({ repo, owner, ref });
  var sha_latest_commit = object.sha;

  // 2. Find and store the SHA for the tree object that the heads/branch commit points to.
  var {
    data: { tree },
  } = await github.git.getCommit({
    repo,
    owner,
    commit_sha: sha_latest_commit,
  });
  var sha_base_tree = tree.sha;

  // 3. Create some content
  var {
    data: { sha: blob_sha },
  } = await github.git.createBlob({
    repo,
    owner,
    encoding: 'base64',
    content: Buffer.from(content).toString('base64'),
  });

  // 4. Create a new tree with the content in place
  var { data: new_tree } = await github.git.createTree({
    repo,
    owner,
    base_tree: sha_base_tree, // if we don't set this, all other files will show up as deleted.
    tree: [
      {
        path,
        mode: '100644',
        type: 'blob',
        sha: blob_sha,
      },
    ],
  });

  // 5. Create a new commit with this tree object
  var { data: new_commit } = await github.git.createCommit({
    repo,
    owner,
    message: 'Update Questionnaire ' + fileName,
    tree: new_tree.sha,
    parents: [sha_latest_commit],
  });

  // 6. Move the reference to point at new commit.
  var {
    data: { object: updated_ref },
  } = await github.git.updateRef({
    repo,
    owner,
    ref,
    sha: new_commit.sha,
  });
}

module.exports = { postToGithub };
