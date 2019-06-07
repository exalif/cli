'use strict';

const RancherIngressUtils = require('../../rancher/ingress');

exports.command = 'ingress <ingress> of <namespace>';
exports.describe = 'Remove an ingress of namespace';

exports.builder = (yargs) => {
  return yargs
    .usage(`remove ingress <ingress> of <namespace>

DESCRIPTION:
Remove an ingress in a given namespace.`);
}

exports.handler = async (argv) => {
  let rancherIngressUtils = new RancherIngressUtils(argv);

  try {
    await rancherIngressUtils.removeIngress()
    console.log(`Ingress was removed`);
  }
  catch (e) {
    console.error(`Ingress was not removed`);
    console.error(e);
    process.exit(1);
  }
}
