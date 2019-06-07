'use strict';

const RancherStackUtils = require('../../rancher/stack');

exports.command = 'stack on <namespace> [options]'
exports.describe = 'Deploy a stack from yaml file on namespace'

exports.builder = (yargs) => {
  return yargs
    .usage(`deploy stack on <namespace> [options]

DESCRIPTION:
Deploy a stack in a given namespace. The namespace will be created if it doesn't exist.

Required: EXALIF_STACK_FILE environment variable`)
    .option('stackFile', {
      description: 'yaml stack file url',
      string: true,
      global: true,
      demandOption: true
    })
    .option('ingress', {
      description: '[JSON Object] Ingress data in case a stack contains ingress type',
      string: true,
      global: true,
      demandOption: false
    })
    .option('image', {
      description: 'Image to use during deploy',
      default: 'latest',
      string: true,
      global: true,
      demandOption: false
    })
    .option('create-non-existing-namespace', {
      alias: ['cn'],
      describe: `Create namespace if it doesn't exist`,
      default: true,
      global: true,
      boolean: true
    })
    .option('copy-certificate-from-namespace', {
      alias: ['cert-from', 'cf'],
      describe: `Copy SSL certificate from other namespace`,
      default: null,
      string: true,
      global: true,
      implies: 'ingress'
    });
}

exports.handler = async (argv) => {
  let rancherStackUtils = new RancherStackUtils(argv);

  try {
    await rancherStackUtils.deployStack();
    console.log(`Stack was deployed`);
  } catch (e) {
    console.error(`Stack was not deployed`);
    console.error(e);
    process.exit(1);
  }
}
