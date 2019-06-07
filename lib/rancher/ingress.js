'use strict';

const fs = require('fs');
const style = require('ansi-styles');

const RancherUtils = require('./utils');
const Utils = require('../utils/utils');
const withSpinner = require('../utils/withSpinner');
const Rancher = require('./rancher');
const config = require('../../config/config').config;

const rancherIngressMixin = superclass => class extends superclass {
  async deployIngress() {
    try {
      const targetService = await withSpinner({
        task: Utils.getRancherTarget.bind(this)(),
        textOnStart: `[${this.ingress.name}] Checking target resource...`,
        spinnerType: `arrow3`,
        textOnSuccess: result => `Target resource parsed: ${style.cyan.open}${result}${style.cyan.close} - Type: ${this.type}`,
        textOnError: error => error,
      });

      const createIngressFile = await withSpinner({
        task: this.createIngressFile(),
        textOnStart: `[${this.ingress.name}] Generating ingress template...`,
        spinnerType: `arrow3`,
        textOnSuccess: result => `Ingress template generated: ${style.cyan.open}${result}${style.cyan.close}`,
        textOnError: error => error,
      });

      const login = await withSpinner({
        task: RancherUtils.login.bind(this)(),
        textOnStart: `[${this.ingress.name}] Login to orchestrator...`,
        spinnerType: `arrow3`,
        textOnSuccess: result => `Login succeeded`,
        textOnError: error => error,
      });

      const deployIngress = await withSpinner({
        task: this.createIngressOnCluster(),
        textOnStart: `[${this.ingress.name}] Deploying ingress on cluster. Please wait...`,
        spinnerType: `arrow3`,
        textOnSuccess: result => `[${style.cyan.open}${this.ingress.name}${style.cyan.close}] Ingress was deployed on cluster.`,
        textOnError: error => `[${this.ingress.name}] Ingress deployment failed due to: ${error}`,
      });

      const checkIngressDeploy = await withSpinner({
        task: RancherUtils.checkDeployOnCluster.bind(this)(targetService),
        textOnStart: `[${this.ingress.name}] Retrieving state ...`,
        spinnerType: `arrow3`,
        textOnSuccess: result => `[${style.cyan.open}${this.ingress.name}${style.cyan.close}] State was retrieved: ${style.green.open}${result}${style.green.close}`,
        textOnError: error => `[${this.ingress.name}] Checking upgrade failed. Please check in the orchestrator UI. ${error}`,
      });
    } catch (error) {
      throw Error(error);
    };
  };

  async removeIngress() {
    try {
      const login = await withSpinner({
        task: RancherUtils.login.bind(this)(),
        textOnStart: `[${this.ingress.name}] Login to orchestrator...`,
        spinnerType: `arrow3`,
        textOnSuccess: result => `Login succeeded`,
        textOnError: error => error,
      });

      const removeIngress = await withSpinner({
        task: this.removeIngressFromCluster(),
        textOnStart: `[${this.ingress.name}] Removing ingress from cluster. Please wait...`,
        spinnerType: `arrow3`,
        textOnSuccess: result => `[${style.cyan.open}${this.ingress.name}${style.cyan.close}] Ingress was removed from cluster.`,
        textOnError: error => `[${this.ingress.name}] Ingress removal failed due to: ${error}`,
      });
    } catch (error) {
      throw Error(error);
    };
  };

  createIngressFile() {
    const ingressTemplate = `${config.templateDirectory}/ingress.yaml`;
    const destinationTemplate = `${config.templateDestinationDirectory}/ingress.yaml`;

    return new Promise(async (resolve, reject) => {
      try {
        let result = fs.readFileSync(ingressTemplate, 'utf8');

        for (let [key, value] of Object.entries(config.ingressTemplateReplaceMap)) {
          const regex = new RegExp(key, 'g');
          result = result.replace(regex, this[value] || this.ingress[value]);
        }

        fs.mkdirSync(config.templateDestinationDirectory, { recursive: true });

        fs.writeFileSync(destinationTemplate, result, 'utf8');

        resolve(result);
      } catch (err) {
        reject(err.name || err);
      }
    });
  }

  createIngressOnCluster() {
    const destinationTemplate = `${config.templateDestinationDirectory}/ingress.yaml`;

    const command = `kubectl`;

    const args = [
      `apply`,
      '-f',
      destinationTemplate
    ];

    console.log(`Executing ${command} ${args.join(' ')}`);

    return Utils.rancherExecute(command, args).then(res => {
      return res;
    });
  }

  removeIngressFromCluster() {
    const command = `kubectl`;

    const args = [
      `delete`,
      'ingress',
      this.ingress.name,
      '-n',
      this.namespace
    ];

    console.log(`Executing ${command} ${args.join(' ')}`);

    return Utils.rancherExecute(command, args).then(res => {
      return res;
    });
  }
}

module.exports = class RancherIngressUtils extends rancherIngressMixin(Rancher){
  constructor(...args) {
    super(...args)
  }
};
