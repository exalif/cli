'use strict';

const fs = require('fs');
const path = require('path');
const style = require('ansi-styles');
const yaml = require('js-yaml');
const { v4: uuidv4 } = require('uuid');

const RancherSingleServiceUtils = require('./service');
const RancherUtils = require('./utils');
const Utils = require('../utils/utils');
const withSpinner = require('../utils/withSpinner');
const Rancher = require('./rancher');
const config = require('../../config/config').config;

const rancherStackMixin = superclass => class extends superclass {
  async deployStack() {
    const createStackTemplateWithReplacedValues = await withSpinner({
      task: this.createStackTemplateWithReplacedValues(),
      textOnStart: `[${this.stackFile}] Generating stack template...`,
      spinnerType: `arrow3`,
      textOnSuccess: result =>
        this.verbose
        ? `[${this.stackFile}] Stack template generated: \n${style.cyan.open}${result}${style.cyan.close}`
        : `[${this.stackFile}] Stack template generated`,
      textOnError: error => error,
    });

    const login = await withSpinner({
      task: RancherUtils.login.bind(this)(),
      textOnStart: `[${this.stackTemplate}] Login to orchestrator...`,
      spinnerType: `arrow3`,
      textOnSuccess: result => `Login succeeded`,
      textOnError: error => error,
    });

    const createNamespace = await withSpinner({
      task: RancherUtils.createNamespace.bind(this)(),
      textOnStart: `[${this.namespace}] Creating namespace if not existing...`,
      spinnerType: `arrow3`,
      textOnSuccess: result => `Namespace created/exists`,
      textOnError: error => error,
    });

    const copyingCerts = await withSpinner({
      task: RancherUtils.copyCertificate.bind(this)(),
      textOnStart: `[${this.namespace}] Copying required certs...`,
      spinnerType: `arrow3`,
      textOnSuccess: result => `${result}`,
      textOnError: error => error,
    });

    const deployStack = await withSpinner({
      task: this.createStackOnCluster(),
      textOnStart: `[${this.stackTemplate}] Deploying stack on cluster. Please wait...`,
      spinnerType: `arrow3`,
      textOnSuccess: result => `[${style.cyan.open}${this.stackTemplate}${style.cyan.close}] Stack was deployed on cluster.`,
      textOnError: error => `[${this.stackTemplate}] Stack deployment failed due to: ${error}`,
    });

    const checkStackDeploy = await withSpinner({
      task: this.checkStackDeploy(createStackTemplateWithReplacedValues),
      textOnStart: `[${this.stackTemplate}] Retrieving state ...`,
      spinnerType: `arrow3`,
      textOnSuccess: result => `[${style.cyan.open}${this.stackTemplate}${style.cyan.close}] State was retrieved: ${style.green.open}${result}${style.green.close}`,
      textOnError: error => `[${this.stackTemplate}] Checking upgrade failed. Please check in the orchestrator UI. ${error}`,
    });
  }

  async checkStackDeploy(yamlContent) {
    const doc = yaml.safeLoad(yamlContent);

    const services = doc.items
      .filter((item) => config.checkDeployTypes.includes(item.kind.toLowerCase()))
      .map((item) => ({ name: item.metadata.name, type: item.kind.toLowerCase(), replicas: item.spec.replicas }));

    let checkDeployTasks = services
      .map(async (service, index) => {
        const rancherSingleServiceutils = new RancherSingleServiceUtils(this);
        rancherSingleServiceutils.type = service.type;
        rancherSingleServiceutils.service = service.name;
        rancherSingleServiceutils.replicas = service.replicas;
        rancherSingleServiceutils.namespace = this.namespace;

        try {
          const targetService = await withSpinner({
            task: Utils.getRancherTarget.bind(rancherSingleServiceutils)(),
            textOnStart: `[${this.service}] Checking target resource...`,
            spinnerType: `arrow3`,
            textOnSuccess: result => `Target resource parsed: ${style.cyan.open}${result}${style.cyan.close}`,
            textOnError: error => error,
          });

          const checkUpgradeResult = await withSpinner({
            task: RancherUtils.checkDeployOnCluster.bind(rancherSingleServiceutils)(targetService),
            textOnStart: `[${targetService}] Retrieving state ...`,
            spinnerType: `arrow3`,
            textOnSuccess: result => `[${style.cyan.open}${targetService}${style.cyan.close}] State was retrieved: ${style.green.open}${result}${style.green.close}`,
            textOnError: error => `[${targetService}] Checking upgrade failed. Please check in the orchestrator UI. ${error}`,
          });

          return { service: targetService, result: checkUpgradeResult };
        } catch(e) {
          throw Error(e);
        }
      });

    try {
      let deployResults = await Promise.all(checkDeployTasks);

      console.log(`Tasks deployed with results:`);
      RancherUtils.displayStackResult(deployResults);

      return 'OK';
    } catch (error) {
      throw Error(error);
    }
  }

  createStackTemplateWithReplacedValues() {
    const templateFile = path.basename(this.stackFile);
    this.stackTemplate = `${config.templateDestinationDirectory}/${templateFile}`;

    return new Promise(async (resolve, reject) => {
      try {
        let result = fs.readFileSync(this.stackFile, 'utf8');

        for (let [key, value] of Object.entries(config.stackTemplateReplaceMap)) {
          const regex = new RegExp(key, 'g');
          let replacedValue = '';

          if (this[value]) {
            replacedValue = this[value];
          } else if (!!this.ingress && this.ingress[value]) {
            replacedValue = this.ingress[value];
          }

          result = result.replace(regex, replacedValue);
        }

        const matchedUUIDCount = ( result.match(/UUID/g) || [] ).length;
        for (let i = 0; i < matchedUUIDCount; i++) {
          result = result.replace(/UUID/, uuidv4());
        }

        fs.mkdirSync(config.templateDestinationDirectory, { recursive: true });

        fs.writeFileSync(this.stackTemplate, result, 'utf8');

        resolve(result);
      } catch (err) {
        const noEntryError = err && err.code === 'ENOENT' ? `${err.code} - Cannot read: ${err.path}` : null;
        reject(noEntryError || err);
      }
    });
  }

  createStackOnCluster() {
    const command = `kubectl`;

    const args = [
      `apply`,
      '-f',
      this.stackTemplate
    ];

    console.log(`Executing ${command} ${args.join(' ')}`);

    return Utils.rancherExecute(command, args).then(res => {
      return res;
    });
  }
};

module.exports = class RancherStackUtils extends rancherStackMixin(Rancher){
  constructor(...args) {
    super(...args)
  }
};
