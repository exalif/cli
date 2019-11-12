'use strict';

const style = require('ansi-styles');
const uuidv4 = require('uuid/v4');
const Utils = require('../utils/utils');

module.exports = class Rancher {
  constructor({
    orchestratorUrl = null,
    orchestratorAccessKey = null,
    orchestratorSecretKey = null,
    projectId = null,
    uniqueId = uuidv4(),
    namespace = null,
    service = null,
    servicesList = null,
    imagesList = null,
    image = null,
    ingress = null,
    force = null,
    stackFile = null,
    createNonExistingNamespace = true,
    certFrom = null,
    execCommand = null,
    verbose = null,
  } = {}) {
    Object.assign(this, {
      orchestratorUrl,
      orchestratorAccessKey,
      orchestratorSecretKey,
      projectId,
      uniqueId,
      namespace,
      service,
      servicesList: Utils.getDefaultFromStringOrJson(servicesList, []),
      imagesList: Utils.getDefaultFromStringOrJson(imagesList, []),
      image,
      ingress: Utils.getDefaultFromStringOrJson(ingress),
      force,
      stackFile,
      createNonExistingNamespace,
      certFrom,
      execCommand,
      verbose,
    });

    this.type = !!this.ingress ? 'ingress' : 'deployment';
    this.apiUrl = this.orchestratorUrl + '/v3';
    this.loginToken = `${this.orchestratorAccessKey}:${this.orchestratorSecretKey}`;

    console.log(`Orchestrator configured with:
    - url: ${style.bold.open}${this.orchestratorUrl}${style.bold.close}
    - access-key: ${style.bold.open}${this.orchestratorAccessKey}${style.bold.close}
    - secret-key: ${style.red.open}top secret ye parrot lover!${style.red.close}
    - project-id: ${style.bold.open}${this.projectId}${style.bold.close}
    - unique-id (deployment): ${style.bold.open}${this.uniqueId}${style.bold.close}
    - namespace: ${style.bold.open}${this.namespace}${style.bold.close}`);

    if (!!this.image) {
      console.log(`    - image: ${style.bold.open}${this.image}${style.bold.close}`);
    }

    if (this.servicesList.length > 0) {
      console.log(`    - services: ${style.bold.open}${this.servicesList.join(', ')}${style.bold.close}`)
    }

    if (this.imagesList.length > 0) {
      console.log(`    - images: ${style.bold.open}${this.imagesList.join(', ')}${style.bold.close}`)
    }

    if (!!this.ingress) {
      console.log(`    - ingress details: ${style.bold.open}${JSON.stringify(this.ingress)}${style.bold.close}`);
    }

    if (!!this.execCommand) {
      console.log(`    - executed command: ${style.bold.open}${JSON.stringify(this.execCommand)}${style.bold.close}`);
    }
  }
}
