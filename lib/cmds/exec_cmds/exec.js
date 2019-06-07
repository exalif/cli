'use strict';

const RancherExecUtils = require('../../rancher/exec');

exports.command = 'on <service> of <namespace>';
exports.describe = `Exec a command in a given running service's pod`;

exports.builder = (yargs) => {
  return yargs
    .usage(`on <service> of <namespace>

DESCRIPTION:
Execute a command in a given running service's pod

****CAUTION****: currently this can only be ran on a pod with a single container`)
  .option('execCommand', {
    description: 'Command to execute on pod',
    string: true,
    global: false,
    demandOption: true
  });
}

exports.handler = async (argv) => {
  let rancherExecUtils = new RancherExecUtils(argv);

  try {
    await rancherExecUtils.runCommand();
    console.log(`Command was executed`);
  } catch (e) {
    console.error(`Command was not executed`);
    console.error(e);
    process.exit(1);
  }
}
