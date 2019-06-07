'use strict';

const RancherSingleServiceUtils = require('../../rancher/service');

exports.command = 'service <service> of <namespace>';
exports.describe = 'Upgrade a service';

exports.builder = (yargs) => {
  return yargs
    .usage(`upgrade service <service> of <namespace>

DESCRIPTION:
Upgrade a service (k8s deployment) on a given namespace. If service doesn't exist, it will fail.`)
    .option('force', {
      alias: ['f'],
      describe: 'force upgrade even if state is not active',
      default: false,
      boolean: true
    })
    .option('image', {
      description: 'Image to use during upgrade',
      string: true,
      global: true,
      demandOption: false
    });
}

exports.handler = async (argv) => {
  let rancherSingleServiceUtils = new RancherSingleServiceUtils(argv);

  try {
    await rancherSingleServiceUtils.upgradeService()
    console.log(`Service upgraded`);
  } catch (e) {
    console.error(`Service was not upgraded`);
    console.error(e);
    process.exit(1);
  }
}
