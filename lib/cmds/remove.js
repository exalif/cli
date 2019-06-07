'use strict';

exports.command = 'remove <command>'
exports.desc = 'Remove commands!'

exports.builder = (yargs) => {
  return yargs
    .commandDir('remove_cmds');
}
