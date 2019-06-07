'use strict';

exports.command = 'exec <command>'
exports.desc = 'Exec commands!'

exports.builder = (yargs) => {
  return yargs
    .commandDir('exec_cmds');
}
