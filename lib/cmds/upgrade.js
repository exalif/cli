'use strict';

exports.command = 'upgrade <command>'
exports.desc = 'Upgrade commands!'

exports.builder = (yargs) => {
  return yargs
    .commandDir('upgrade_cmds');
}
