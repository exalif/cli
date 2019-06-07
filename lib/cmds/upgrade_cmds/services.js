'use strict';

const RancherMultipleServicesUtils = require('../../rancher/services');

exports.command = 'services of <namespace>';
exports.describe = 'Upgrade multiple services';

exports.builder = (yargs) => {
  return yargs
    .usage(`upgrade services of <namespace>

DESCRIPTION:
Upgrade multiple services (k8s deployment) on a given namespace. Services are defined using array in environment variables`)
    .option('force', {
      alias: ['f'],
      describe: 'force upgrade even if state is not active',
      default: false,
      boolean: true
    })
    .option('servicesList', {
      description: '[JSON Array] Services to upgrade during multiple services upgrade',
      string: true,
      global: true,
      demandOption: true
    })
    .option('imagesList', {
      description: '[JSON Array] Images to use during multiple services upgrade (in the same order than services list)',
      string: true,
      global: true,
      demandOption: false
    });
}

exports.handler = async (argv) => {
  let rancherMultipleServicesUtils = new RancherMultipleServicesUtils(argv);

  try {
    await rancherMultipleServicesUtils.upgradeMultipleServices()
    console.log(`Services upgraded`);
  } catch(e) {
    console.error(`Services were not upgraded`);
    console.error(e);
    process.exit(1);
  };
}
