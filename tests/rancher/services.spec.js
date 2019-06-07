'use strict';

const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');
chai.use(require('sinon-chai'));
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
const style = require('ansi-styles');

let proxyquireStrict = require('proxyquire').noCallThru();

let sandbox, RancherMultipleServicesUtils, consoleStub, upgradeServiceStub, displayStackResultStub;

const UPGRADE_SERVICE_RESULT = 'someCheckUpgradeResult';
const NAMESPACE = 'someNamespace';
const RANCHER_INSTANCE_MOCK = {
  orchestratorUrl: 'someUrl',
  apiUrl: 'someUrl/v3',
  orchestratorAccessKey: 'someAccessKey',
  orchestratorSecretKey: 'someSecretKey',
  projectId: 'someProjectId',
  loginToken: 'someAccessKey:someSecretKey',
  force: false,
  namespace: NAMESPACE,
  service: 'someService',
  uniqueId: 'someUniqueId',
};
const RANCHER_INSTANCE_MOCK_WITH_IMAGES = {
  ...RANCHER_INSTANCE_MOCK,
  servicesList: ['service1'],
  imagesList: ['image1']
}

class RancherSingleServiceUtils {
  constructor(...args){
    Object.assign(this, ...args);
  }
}

describe('RancherMultipleServicesUtils class', () => {
  beforeEach(() => {
    sandbox = sinon.createSandbox();

    upgradeServiceStub = sandbox.stub().resolves(UPGRADE_SERVICE_RESULT);

    RancherSingleServiceUtils.prototype.upgradeService = upgradeServiceStub;

    consoleStub = sandbox.stub(console, 'log');
    displayStackResultStub = sandbox.stub().callsFake(results => console.log(JSON.stringify(results)));

    RancherMultipleServicesUtils = proxyquireStrict('../../lib/rancher/services', {
      './service': RancherSingleServiceUtils,
      './utils': {
        displayStackResult: displayStackResultStub,
      },
    });
  });

  afterEach(() => {
    sandbox.restore();
    RancherMultipleServicesUtils = require('../../lib/rancher/services');
  });

  describe('upgradeMultipleServices', () => {
    let command, instance;

    describe('when servicesList is empty', () => {
      beforeEach(() => {
        instance = new RancherMultipleServicesUtils(RANCHER_INSTANCE_MOCK);

        command = instance.upgradeMultipleServices.bind(instance);
      });

      it('should reject', async () => {
        await expect(command()).to.eventually.be.rejectedWith(`Services list cannot be empty. Ensure to define services as JSON array in command`);
      });
    });

    describe('when servicesList is provided but imagesList is not corresponding', () => {
      beforeEach(() => {
        instance = new RancherMultipleServicesUtils({ ...RANCHER_INSTANCE_MOCK, servicesList: ['service1', 'service2'], imagesList: ['image1']});

        command = instance.upgradeMultipleServices.bind(instance);
      });

      it('should reject', async () => {
        await expect(command()).to.eventually.be.rejectedWith(`Images are defined for service list but the number of images provided doesn't match the number of services to be upgraded`);
      });
    });

    describe('on success', () => {
      beforeEach(() => {
        instance = new RancherMultipleServicesUtils(RANCHER_INSTANCE_MOCK_WITH_IMAGES);

        command = instance.upgradeMultipleServices.bind(instance);
      });

      it('should resolve', async () => {
        await expect(command()).to.eventually.be.fulfilled;
      });

      it('should call console log', async () => {
        await command();

        expect(consoleStub).to.have.been.calledWith(`Tasks starting...`);
        expect(consoleStub).to.have.been.calledWith(`Upgrade tasks ended with result:`);
        expect(consoleStub).to.have.been.calledWith(`["someCheckUpgradeResult"]`);
      });

      it('should call upgradeService', async () => {
        await command();

        expect(upgradeServiceStub).to.have.been.called;
      });
    });

    describe('when an error occurs', () => {
      beforeEach(() => {
        RancherSingleServiceUtils.prototype.upgradeService = sandbox.stub().rejects('upgradeServiceError');;

        instance = new RancherMultipleServicesUtils(RANCHER_INSTANCE_MOCK_WITH_IMAGES);
        command = instance.upgradeMultipleServices.bind(instance);
      });

      it('should resolves', async () => {
        await expect(command()).to.eventually.be.rejectedWith('upgradeServiceError');
      });
    });
  });
});
