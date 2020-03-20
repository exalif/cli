'use strict';

const fs = require('fs');
const style = require('ansi-styles');

const RancherUtils = require('./utils');
const Utils = require('../utils/utils');
const withSpinner = require('../utils/withSpinner');
const Rancher = require('./rancher');
const config = require('../../config/config').config;

const rancherExecMixin = superclass => class extends superclass {
  async runCommand() {
    try {
      const targetService = await withSpinner({
        task: Utils.getRancherTarget.bind(this)(),
        textOnStart: `[${this.service}] Checking target service...`,
        spinnerType: `arrow3`,
        textOnSuccess: result => `Target service parsed: ${style.cyan.open}${result}${style.cyan.close} - Type: ${this.type}`,
        textOnError: error => error,
      });

      const login = await withSpinner({
        task: RancherUtils.login.bind(this)(),
        textOnStart: `[${this.service}] Login to orchestrator...`,
        spinnerType: `arrow3`,
        textOnSuccess: result => `Login succeeded`,
        textOnError: error => error,
      });

      const findPod = await withSpinner({
        task: RancherUtils.inspectPodsInProject.bind(this)(targetService),
        textOnStart: `[${this.service}] Retrieving state ...`,
        spinnerType: `arrow3`,
        textOnSuccess: result => `[${style.cyan.open}${this.service}${style.cyan.close}] Retrieved pod: ${style.green.open}${this.extractPodInList(result.data)}${style.green.close}`,
        textOnError: error => `[${this.service}] Checking resource failed. Please check in the orchestrator UI. ${error}`,
      });

      const podName = this.extractPodInList(findPod.data);

      const executeCommand = await withSpinner({
        task: this.executeCommandOnPod(podName),
        textOnStart: `[${podName}] Executing command ${style.green.open}${this.execCommand}${style.green.close} on pod ${style.green.open}${podName}${style.green.close}. Please wait...`,
        spinnerType: `arrow3`,
        textOnSuccess: result => `[${style.cyan.open}${podName}${style.cyan.close}] Command ${style.green.open}${this.execCommand}${style.green.close} was properly executed on pod ${style.green.open}${podName}${style.green.close} with results:\n${result}.`,
        textOnError: error => `[${podName}] Execution of command failed due to: ${error}`,
      });
    } catch (error) {
      throw Error(error);
    };
  };

  extractPodInList(podArray) {
    return podArray.find(pod => pod.name.includes(this.service)).name;
  }

  executeCommandOnPod(podName) {
    const command = `kubectl`;

    const args = [
      `exec`,
      podName,
      '-n',
      this.namespace,
      '--',
      ...this.execCommand.split(' ')
    ];

    console.log(`Executing ${command} ${args.join(' ')}`);

    return Utils.rancherExecute(command, args).then(res => {
      return res;
    });
  }
}

module.exports = class RancherExecUtils extends rancherExecMixin(Rancher){
  constructor(...args) {
    super(...args)
  }
};
