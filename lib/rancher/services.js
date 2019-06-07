'use strict';

const RancherUtils = require('./utils');
const Rancher = require('./rancher');
const RancherSingleServiceUtils = require('./service');

const rancherMultipleServicesMixin = superclass => class extends superclass {
  async upgradeMultipleServices() {
    if (this.servicesList.length === 0 ) {
      throw Error(`Services list cannot be empty. Ensure to define services as JSON array in command`);
    }

    if (this.servicesList.length > 0 && this.servicesList.length !== this.imagesList.length ) {
      throw Error(`Images are defined for service list but the number of images provided doesn't match the number of services to be upgraded`);
    }

    let upgradeTasks = this.servicesList
      .map((service, index) => {
        const rancherSingleServiceutils = new RancherSingleServiceUtils(this);
        rancherSingleServiceutils.service = service;
        rancherSingleServiceutils.image = this.imagesList[index];

        return rancherSingleServiceutils.upgradeService()
      });

    console.log(`Tasks starting...`);

    try {
      let upgradeResults = await Promise.all(upgradeTasks);

      console.log(`Upgrade tasks ended with result:`);
      RancherUtils.displayStackResult(upgradeResults);
    } catch (error) {
      throw Error(error);
    }
  }
};

module.exports = class RancherMultipleServicesUtils extends rancherMultipleServicesMixin(Rancher){
  constructor(...args) {
    super(...args)
  }
};
