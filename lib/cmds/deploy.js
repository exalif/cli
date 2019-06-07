'use strict';

exports.command = 'deploy <command>'
exports.desc = 'Deploy commands!'

exports.builder = (yargs) => {
  return yargs
    .commandDir('deploy_cmds');
}
