'use strict';

const RancherIngressUtils = require('../../rancher/ingress');

exports.command = 'ingress on <namespace>';
exports.describe = 'Deploy an ingress on namespace';

exports.builder = (yargs) => {
  return yargs
    .usage(`deploy ingress on <namespace>

DESCRIPTION:
Deploy an ingress in a given namespace.

Required: EXALIF_INGRESS environment variable`)
    .option('ingress', {
      description: '[JSON Object] Ingress to deploy with ingress command',
      string: true,
      global: true,
      demandOption: true
    });
}

exports.handler = async (argv) => {
  let rancherIngressUtils = new RancherIngressUtils(argv);

  try {
    await rancherIngressUtils.deployIngress();
    console.log(`Ingress was deployed`);
  } catch (e) {
    console.error(`Ingress was not deployed`);
    console.error(e);
    process.exit(1);
  }
}
