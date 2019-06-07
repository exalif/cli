'use strict';

const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');
chai.use(require('sinon-chai'));
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
const style = require('ansi-styles');

let proxyquireStrict = require('proxyquire').noCallThru();

let sandbox, RancherNamespaceUtils, consoleStub, rancherExecuteStub, withSpinnerStub, loginStub;

const NAMESPACE = 'someNamespace';
const RANCHER_INSTANCE_MOCK = {
  orchestratorUrl: 'someUrl',
  apiUrl: 'someUrl/v3',
  orchestratorAccessKey: 'someAccessKey',
  orchestratorSecretKey: 'someSecretKey',
  projectId: 'someProjectId',
  loginToken: 'someAccessKey:someSecretKey',
  force: false,
  namespace: NAMESPACE
}

describe('RancherNamespaceUtils class', () => {
  beforeEach(() => {
    sandbox = sinon.createSandbox();

    consoleStub = sandbox.stub(console, 'log');
    rancherExecuteStub = sandbox.stub().resolves('executeOk');

    loginStub = sandbox.stub().resolves();

    withSpinnerStub = sandbox.stub().onCall(0).returns(loginStub);

    RancherNamespaceUtils = proxyquireStrict('../../lib/rancher/namespace', {
      '../utils/withSpinner': withSpinnerStub,
      '../utils/utils': {
        rancherExecute: rancherExecuteStub
      },
      './utils': {
        login: loginStub
      }
    });
  });

  afterEach(() => {
    sandbox.restore();
    RancherNamespaceUtils = require('../../lib/rancher/namespace');
  });

  describe('removeNamespaceFromCluster', () => {
    let command, instance;

    beforeEach(() => {
      instance = new RancherNamespaceUtils(RANCHER_INSTANCE_MOCK);
      command = instance.removeNamespaceFromCluster.bind(instance);
    });

    it('should execute getServiceUpgradePayload command', async () => {
      await expect(command()).to.eventually.become('executeOk');
    });


    it('should call rancherExecute with proper arguments', async () => {
      const args = [
        'delete',
        RANCHER_INSTANCE_MOCK.namespace
      ];

      await command();

      expect(consoleStub).to.have.callCount(2);
      expect(consoleStub.getCall(1).args[0]).to.equal(`Executing namespaces ${args.join(' ')}`);
      expect(rancherExecuteStub).to.have.been.calledWith('namespaces', args, null, 'Not found');
    });
  });

  describe('removeNamespace', () => {
    let command, instance;

    describe('when on success', () => {
      beforeEach(() => {
        instance = new RancherNamespaceUtils(RANCHER_INSTANCE_MOCK);
        instance.removeNamespaceFromCluster = sandbox.stub().resolves('namespaceRemoved');
        command = instance.removeNamespace.bind(instance);
      });

      it('should resolves', async () => {
        await expect(command()).to.eventually.be.fulfilled;
      });

      it('should call login and removeNamespace methods', async () => {
        await command();
        const loginArgs = withSpinnerStub.getCall(0).args[0];
        const removeArgs = withSpinnerStub.getCall(1).args[0];

        expect(loginStub).to.have.been.called;

        expect(loginArgs.textOnStart).to.equal(`[${NAMESPACE}] Login to orchestrator...`);
        expect(loginArgs.spinnerType).to.equal(`arrow3`);
        expect(loginArgs.textOnSuccess()).to.equal(`Login succeeded`);
        expect(loginArgs.textOnError('someError')).to.equal(`someError`);

        expect(instance.removeNamespaceFromCluster).to.have.been.called;

        expect(removeArgs.textOnStart).to.equal(`[${NAMESPACE}] Removing namespace from cluster. Please wait...`);
        expect(removeArgs.spinnerType).to.equal(`arrow3`);
        expect(removeArgs.textOnSuccess()).to.equal(`[${style.cyan.open}${NAMESPACE}${style.cyan.close}] Namespace was removed from cluster.`);
        expect(removeArgs.textOnError('someError')).to.equal(`[${NAMESPACE}] Namespace removal failed due to: someError`);
      });
    });

    describe('when an error occurs', () => {
      beforeEach(() => {
        instance = new RancherNamespaceUtils(RANCHER_INSTANCE_MOCK);
        instance.removeNamespaceFromCluster = sandbox.stub().throws('removeError');
        command = instance.removeNamespace.bind(instance);
      });

      it('should resolves', async () => {
        await expect(command()).to.eventually.be.rejectedWith('removeError');
      });
    });
  });
});
