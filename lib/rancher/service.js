'use strict';

const style = require('ansi-styles');

const RancherUtils = require('./utils');
const Rancher = require('./rancher');
const Utils = require('../utils/utils');
const withSpinner = require('../utils/withSpinner');

const rancherSingleServiceMixin = superclass => class extends superclass {
  async upgradeService() {
    try {
      const targetService = await withSpinner({
        task: Utils.getRancherTarget.bind(this)(),
        textOnStart: `[${this.service}] Checking target resource...`,
        spinnerType: `arrow3`,
        textOnSuccess: result => `Target resource parsed: ${style.cyan.open}${result}${style.cyan.close}`,
        textOnError: error => error,
      });

      const login = await withSpinner({
        task: RancherUtils.login.bind(this)(),
        textOnStart: `[${this.service}] Login to orchestrator...`,
        spinnerType: `arrow3`,
        textOnSuccess: result => `Login succeeded`,
        textOnError: error => error,
      });

      const upgradePayload = await withSpinner({
        task: RancherUtils.getServiceUpgradePayload.bind(this)(targetService),
        textOnStart: `[${this.service}] Getting upgrade payload. Please wait...`,
        spinnerType: `arrow3`,
        textOnSuccess: result => `[${style.cyan.open}${this.service}${style.cyan.close}] Upgrade payload retrieved successfuly for service ${targetService}`,
        textOnError: error => error,
      });

      const checkState = await withSpinner({
        task: RancherUtils.checkStateBeforeUpgrade.bind(this)(upgradePayload),
        textOnStart: `[${this.service}] Getting service state. Please wait...`,
        spinnerType: `arrow3`,
        textOnSuccess: result => `[${style.cyan.open}${this.service}${style.cyan.close}] Service can be upgraded`,
        textOnError: error => error,
      });

      const upgradeServiceResult = await withSpinner({
        task: this.forcePullUpgradeDeployment(),
        textOnStart: `[${this.service}] Upgrading the service. Please wait...`,
        spinnerType: `arrow3`,
        textOnSuccess: result => `[${style.cyan.open}${this.service}${style.cyan.close}] Image upgrade request for service "${this.service}" was made.`,
        textOnError: error => `[${this.service}] Image upgrade failed due to: ${error} - Please note a first launch of service is required before being able to upgrade it from CLI.`,
      });

      const checkUpgradeResult = await withSpinner({
        task: RancherUtils.checkDeployOnCluster.bind(this)(targetService),
        textOnStart: `[${this.service}] Retrieving state ...`,
        spinnerType: `arrow3`,
        textOnSuccess: result => `[${style.cyan.open}${this.service}${style.cyan.close}] State was retrieved: ${style.green.open}${result}${style.green.close}`,
        textOnError: error => `[${this.service}] Checking upgrade failed. Please check in the orchestrator UI. ${error}`,
      });

      return { service: this.service, result: checkUpgradeResult };
    } catch (error) {
      throw Error(error);
    };
  };

  forcePullUpgradeDeployment() {
    const command = `kubectl`;
    const envs = `[{"name":"FORCE_UPGRADE_BY","value":"${this.uniqueId}"}]`;
    const containers = !!this.image ?
      `[{"name":"${this.service}","image":"${this.image}","env":${envs}}]` :
      `[{"name":"${this.service}","env":${envs}}]`;

    const args = [
      `--namespace=${this.namespace}`,
      'patch',
      'deployment',
      this.service,
      '--type=strategic',
      '-p',
      `{"spec":{"template":{"spec":{"containers":${containers}}}}}`
    ];

    console.log(`Executing ${command} ${args.join(' ')}`);

    return Utils.rancherExecute(command, args).then(res => {
      return res;
    });
  }
};

module.exports = class RancherSingleServiceUtils extends rancherSingleServiceMixin(Rancher){
  constructor(...args) {
    super(...args)
  }
};
