'use strict';

const style = require('ansi-styles');
const fs = require('fs');
const req = require('request-promise-native');

const Utils = require('../utils/utils');
const config = require('../../config/config').config;
const retryTaskUntilExpectedValue = require('../utils/retry').retryTaskUntilExpectedValue;

module.exports = class RancherUtils {
  static login() {
    const command = `login`;
    const loginArgs = [
      '--context',
      this.projectId,
      '-t',
      this.loginToken,
      this.orchestratorUrl
    ];

    return Utils.rancherExecute(command, loginArgs).then(() => {
      return true;
    });
  }

  static getServiceUpgradePayload(targetService) {
    const command = `inspect`;
    const completeDeploymentTarget = [
      this.type === 'deployment' ? `deployment:${targetService}` : targetService
    ];

    return Utils.rancherExecute(command, completeDeploymentTarget).then(res => {
      res = JSON.parse(res);

      const { scheduling, ...payload } = res;

      return payload;
    });
  }

  static inspectPodsInProject(targetService) {
    const apiUrl = `${this.apiUrl}/project/${this.projectId}/pods?workloadId=deployment:${targetService}`;

    const options = {
      method: 'GET',
      uri: apiUrl,
      auth: {
        'user': this.orchestratorAccessKey,
        'pass': this.orchestratorSecretKey
      },
      json: true
    };

    return req(options);
  }

  static checkStateBeforeUpgrade({ state, paused }) {
    if ((state === 'active' && !paused) || this.force) {
      return Promise.resolve(`Service can be upgraded. Forced: ${this.force}`);
    } else {
      return Promise.reject(`We can't upgrade service which is not active and healthy`);
    }
  }

  static checkDeployOnCluster(targetService) {
    const command = `inspect`;
    let checkDeployTarget = [];

    if (this.type === 'ingress') {
      checkDeployTarget.push('--type', 'ingress');
    }

    checkDeployTarget.push(this.type === 'deployment' ? `deployment:${targetService}` : targetService);

    const { checkKeys, expectedCheckValues, maxCheckRetries: maxRetries, initialCheckWaitDelay: initialWaitDelay} = config[this.type];

    let conditions = '';
    let expectedKeys = [...checkKeys];
    let expectedValues = [...expectedCheckValues];

    if (this.assertAgainstTemplateReplicas && this.replicas && this.replicas > 0 && config.checkReplicas.find(check => check === this.type)) {
      const checkReplicasConfig = config.checkReplicas.find(check => check === this.type);

      const keyIndex = expectedKeys.indexOf(checkReplicasConfig.replicasStatusKey);

      if (keyIndex > -1) {
        expectedValues.splice(keyIndex, 1, this.replicas);
      }
    }

    expectedKeys.forEach((key, i) => {
      conditions += '\n  ' + key + ' = ' + expectedValues[i];
    });

    console.log(`Checking that status of service match: ${conditions}`);

    return retryTaskUntilExpectedValue({
      task: () => Utils.rancherExecute(command, checkDeployTarget),
      expectedKeys: config[this.type].checkKeys,
      expectedValues,
      maxRetries,
      initialWaitDelay,
    });
  }

  static displayStackResult(results = []) {
    results.forEach(result => {
      console.log(`  ${style.cyan.open}${result.service}${style.cyan.close} - ${style.green.open}${result.result}${style.green.close}`);
    });
  }

  static async createNamespace() {
    return new Promise(async (resolve, reject) => {
      try {
        const result = await RancherUtils.checkNamespace(this.namespace);
        resolve(result);
      } catch (err) {
        console.error(err);

        // Namespace doesn't exist
        // try to create it if not prevented by option `--create-non-existing-namespace [--cn] false`
        if (this.createNonExistingNamespace) {
          try {
            const result = await RancherUtils.executeCreateNamespace(this.namespace);
            resolve(result);
          } catch (e) {
            console.error(e);
            reject(e.name || e);
          }
        } else {
          reject(err);
        }
      }
    });
  }

  static checkNamespace(namespace) {
    const command = `inspect`;

    const args = [
      `--type`,
      'namespace',
      namespace
    ];

    console.log(`Executing ${command} ${args.join(' ')}`);

    return Utils.rancherExecute(command, args).then(res => {
      return res;
    });
  }

  static executeCreateNamespace(namespace) {
    const command = `namespace`;

    const args = [
      `create`,
      namespace
    ];

    console.log(`Executing ${command} ${args.join(' ')}`);

    return Utils.rancherExecute(command, args).then(res => {
      return res;
    });
  }

  static async copyCertificate() {
    if (!this.certFrom) {
      return Promise.resolve('no need');
    }

    if (!this.ingress || !this.ingress.cert) {
      throw Error('Cert should be provided in ingress object for cert copy to be executed');
    }

    try {
      const certSchema = `${config.templateDestinationDirectory}/cert.yaml`;
      const command = `kubectl`;
      const args = [
        'get',
        'secret',
        this.ingress.cert,
        `--namespace=${this.certFrom}`,
        '--export',
        '-o',
        'yaml'
      ];
      const transferArgs = [
        'apply',
        `--namespace=${this.namespace}`,
        '-f',
        certSchema
      ]

      console.log(`Executing ${command} ${args.join(' ')}`);

      const cert = await Utils.rancherExecute(command, args);

      fs.writeFileSync(certSchema, cert, 'utf8');

      const transferCert = await Utils.rancherExecute(command, transferArgs);

      return transferCert;
    } catch(err) {
      throw Error(err);
    }
  }
}
