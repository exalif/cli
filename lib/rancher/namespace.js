'use strict';

const style = require('ansi-styles');

const withSpinner = require('../utils/withSpinner');
const Rancher = require('./rancher');
const RancherUtils = require('./utils');
const Utils = require('../utils/utils');

const rancherNamespaceMixin = superclass => class extends superclass {
  async removeNamespace() {
    try {
      const login = await withSpinner({
        task: RancherUtils.login.bind(this)(),
        textOnStart: `[${this.namespace}] Login to orchestrator...`,
        spinnerType: `arrow3`,
        textOnSuccess: result => `Login succeeded`,
        textOnError: error => error,
      });

      const removeNamespace = await withSpinner({
        task: this.removeNamespaceFromCluster(),
        textOnStart: `[${this.namespace}] Removing namespace from cluster. Please wait...`,
        spinnerType: `arrow3`,
        textOnSuccess: result => `[${style.cyan.open}${this.namespace}${style.cyan.close}] Namespace was removed from cluster.`,
        textOnError: error => `[${this.namespace}] Namespace removal failed due to: ${error}`,
      });
    } catch (error) {
      throw Error(error);
    };
  };

  removeNamespaceFromCluster() {
    const command = `namespaces`;

    const args = [
      `delete`,
      this.namespace
    ];

    console.log(`Executing ${command} ${args.join(' ')}`);
    const allowFailurePattern = 'Not found';

    return Utils.rancherExecute(command, args, null, allowFailurePattern).then(res => {
      return res;
    });
  }
}

module.exports = class RancherNamespaceUtils extends rancherNamespaceMixin(Rancher){
  constructor(...args) {
    super(...args)
  }
};
