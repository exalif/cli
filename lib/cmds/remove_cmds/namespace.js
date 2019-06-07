'use strict';

const RancherNamespaceUtils = require('../../rancher/namespace');

exports.command = 'ns <namespace>';
exports.describe = 'Remove a namespace';

exports.builder = (yargs) => {
  return yargs
    .usage(`remove ns <namespace>

DESCRIPTION:
Remove a given namespace.`);
}

exports.handler = async (argv) => {
  let rancherNamespaceUtils = new RancherNamespaceUtils(argv);

  try {
    await rancherNamespaceUtils.removeNamespace();
    console.log(`Namespace was removed`);
  } catch(e) {
    console.error(`Namespace was not removed`);
    console.error(e);
    process.exit(1);
  };
}
