'use strict';

const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');
chai.use(require('sinon-chai'));
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
const style = require('ansi-styles');

let proxyquireStrict = require('proxyquire').noCallThru();

let sandbox, RancherSingleServiceUtils, consoleStub, rancherExecuteStub, withSpinnerStub, loginStub, getServiceUpgradePayloadStub, checkStateBeforeUpgradeStub, getRancherTargetStub, checkDeployOnClusterStub, displayStackResultStub;

const TARGET_SERVICE = 'deployment:SomeTargetService';
const UPGRADE_PAYLOAD = { some: 'upgradePayload' };
const CHECK_UPGRADE_RESULT = 'someCheckUpgradeResult';
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
}

describe('RancherSingleServiceUtils class', () => {
  beforeEach(() => {
    sandbox = sinon.createSandbox();

    consoleStub = sandbox.stub(console, 'log');
    rancherExecuteStub = sandbox.stub().resolves('executeOk');
    getRancherTargetStub = sandbox.stub().resolves('getRancherTargetOk');
    getServiceUpgradePayloadStub = sandbox.stub().resolves('getServiceUpgradePayloadOk')
    checkDeployOnClusterStub = sandbox.stub().resolves('checkDeployOnClusterOk');
    checkStateBeforeUpgradeStub = sandbox.stub().resolves('checkStateBeforeUpgradeOk')
    displayStackResultStub = sandbox.stub().callsFake(results => console.log(JSON.stringify(results)));

    withSpinnerStub = sandbox.stub();
    loginStub = sandbox.stub().resolves();

    RancherSingleServiceUtils = proxyquireStrict('../../lib/rancher/service', {
      '../utils/withSpinner': withSpinnerStub,
      '../utils/utils': {
        rancherExecute: rancherExecuteStub,
        getRancherTarget: getRancherTargetStub,
      },
      './utils': {
        login: loginStub,
        getServiceUpgradePayload: getServiceUpgradePayloadStub,
        checkStateBeforeUpgrade: checkStateBeforeUpgradeStub,
        checkDeployOnCluster: checkDeployOnClusterStub,
      },
    });
  });

  afterEach(() => {
    sandbox.restore();
    RancherSingleServiceUtils = require('../../lib/rancher/service');
  });

  describe('upgradeService', () => {
    let command, instance;

    describe('on success', () => {
      beforeEach(() => {
        instance = new RancherSingleServiceUtils(RANCHER_INSTANCE_MOCK);

        instance.forcePullUpgradeDeployment = sinon.stub();

        withSpinnerStub.onCall(0).resolves(TARGET_SERVICE);
        withSpinnerStub.onCall(2).resolves(UPGRADE_PAYLOAD);
        withSpinnerStub.onCall(5).resolves(CHECK_UPGRADE_RESULT)

        command = instance.upgradeService.bind(instance);
      });

      it('should resolve', async () => {
        await expect(command()).to.eventually.become({ service: RANCHER_INSTANCE_MOCK.service, result: CHECK_UPGRADE_RESULT });
      });

      it('should call getRancherTarget', async () => {
        await command();

        const getRancherTargetArgs = withSpinnerStub.getCall(0).args[0];

        expect(getRancherTargetStub).to.have.been.called;
        expect(getRancherTargetArgs.textOnStart).to.equal(`[${RANCHER_INSTANCE_MOCK.service}] Checking target resource...`);
        expect(getRancherTargetArgs.spinnerType).to.equal(`arrow3`);
        expect(getRancherTargetArgs.textOnSuccess('someResult')).to.equal(`Target resource parsed: ${style.cyan.open}someResult${style.cyan.close}`);
        expect(getRancherTargetArgs.textOnError('someError')).to.equal(`someError`);
      });

      it('should call login', async () => {
        await command();

        const loginArgs = withSpinnerStub.getCall(1).args[0];

        expect(loginStub).to.have.been.called;
        expect(loginArgs.textOnStart).to.equal(`[${RANCHER_INSTANCE_MOCK.service}] Login to orchestrator...`);
        expect(loginArgs.spinnerType).to.equal(`arrow3`);
        expect(loginArgs.textOnSuccess()).to.equal(`Login succeeded`);
        expect(loginArgs.textOnError('someError')).to.equal(`someError`);
      });

      it('should call getServiceUpgradePayload', async () => {
        await command();

        const getServiceUpgradePayloadArgs = withSpinnerStub.getCall(2).args[0];

        expect(getServiceUpgradePayloadStub).to.have.been.calledWith(TARGET_SERVICE);
        expect(getServiceUpgradePayloadArgs.textOnStart).to.equal(`[${RANCHER_INSTANCE_MOCK.service}] Getting upgrade payload. Please wait...`);
        expect(getServiceUpgradePayloadArgs.spinnerType).to.equal(`arrow3`);
        expect(getServiceUpgradePayloadArgs.textOnSuccess()).to.equal(`[${style.cyan.open}${RANCHER_INSTANCE_MOCK.service}${style.cyan.close}] Upgrade payload retrieved successfuly for service ${TARGET_SERVICE}`);
        expect(getServiceUpgradePayloadArgs.textOnError('someError')).to.equal(`someError`);
      });

      it('should call checkStateBeforeUpgrade', async () => {
        await command();

        const checkStateBeforeUpgradeArgs = withSpinnerStub.getCall(3).args[0];

        expect(checkStateBeforeUpgradeStub).to.have.been.calledWith(UPGRADE_PAYLOAD);
        expect(checkStateBeforeUpgradeArgs.textOnStart).to.equal(`[${RANCHER_INSTANCE_MOCK.service}] Getting service state. Please wait...`);
        expect(checkStateBeforeUpgradeArgs.spinnerType).to.equal(`arrow3`);
        expect(checkStateBeforeUpgradeArgs.textOnSuccess()).to.equal(`[${style.cyan.open}${RANCHER_INSTANCE_MOCK.service}${style.cyan.close}] Service can be upgraded`);
        expect(checkStateBeforeUpgradeArgs.textOnError('someError')).to.equal(`someError`);
      });

      it('should call forcePullUpgradeDeployment', async () => {
        await command();

        const forcePullUpgradeDeploymentArgs = withSpinnerStub.getCall(4).args[0];

        expect(instance.forcePullUpgradeDeployment).to.have.been.called;
        expect(forcePullUpgradeDeploymentArgs.textOnStart).to.equal(`[${RANCHER_INSTANCE_MOCK.service}] Upgrading the service. Please wait...`);
        expect(forcePullUpgradeDeploymentArgs.spinnerType).to.equal(`arrow3`);
        expect(forcePullUpgradeDeploymentArgs.textOnSuccess()).to.equal(`[${style.cyan.open}${RANCHER_INSTANCE_MOCK.service}${style.cyan.close}] Image upgrade request for service "${RANCHER_INSTANCE_MOCK.service}" was made.`);
        expect(forcePullUpgradeDeploymentArgs.textOnError('someError')).to.equal(`[${RANCHER_INSTANCE_MOCK.service}] Image upgrade failed due to: someError - Please note a first launch of service is required before being able to upgrade it from CLI.`);
      });

      it('should call checkDeployOnCluster', async () => {
        await command();

        const checkDeployOnClusterArgs = withSpinnerStub.getCall(5).args[0];

        expect(checkDeployOnClusterStub).to.have.been.calledWith(TARGET_SERVICE);
        expect(checkDeployOnClusterArgs.textOnStart).to.equal(`[${RANCHER_INSTANCE_MOCK.service}] Retrieving state ...`);
        expect(checkDeployOnClusterArgs.spinnerType).to.equal(`arrow3`);
        expect(checkDeployOnClusterArgs.textOnSuccess('someResult')).to.equal(`[${style.cyan.open}${RANCHER_INSTANCE_MOCK.service}${style.cyan.close}] State was retrieved: ${style.green.open}someResult${style.green.close}`);
        expect(checkDeployOnClusterArgs.textOnError('someError')).to.equal(`[${RANCHER_INSTANCE_MOCK.service}] Checking upgrade failed. Please check in the orchestrator UI. someError`);
      });
    });

    describe('when an error occurs', () => {
      beforeEach(() => {
        instance = new RancherSingleServiceUtils(RANCHER_INSTANCE_MOCK);

        withSpinnerStub.onFirstCall().resolves(TARGET_SERVICE);
        withSpinnerStub.onSecondCall().throws('checkUpgradeFail');

        command = instance.upgradeService.bind(instance);
      });

      it('should reject with error', async () => {
        await expect(command())
        .to.eventually.be.rejectedWith('checkUpgradeFail');
      });
    });
  });

  describe('forcePullUpgradeDeployment', () => {
    let command, instance;

    beforeEach(() => {
      instance = new RancherSingleServiceUtils(RANCHER_INSTANCE_MOCK);
      command = instance.forcePullUpgradeDeployment.bind(instance);
    });

    it('should execute getServiceUpgradePayload command', async () => {
      await expect(command()).to.eventually.become('executeOk');
    });

    describe('with no given images', () => {
      const args = [
        `--namespace=${RANCHER_INSTANCE_MOCK.namespace}`,
        'patch',
        'deployment',
        RANCHER_INSTANCE_MOCK.service,
        '--type=strategic',
        '-p',
        `{"spec":{"template":{"spec":{"containers":[{"name":"${RANCHER_INSTANCE_MOCK.service}","env":[{"name":"FORCE_UPGRADE_BY","value":"${RANCHER_INSTANCE_MOCK.uniqueId}"}]}]}}}}`
      ];

      it('should call console log', async () => {
        await command();

        expect(consoleStub).to.have.callCount(2);
        expect(consoleStub.getCall(1).args[0]).to.equal(`Executing kubectl ${args.join(' ')}`);
      });

      it('should call rancherExecute with proper arguments', async () => {
        await command();

        expect(rancherExecuteStub).to.have.been.calledWith('kubectl', args);
      });
    });

    describe('with given images', () => {
      beforeEach(() => {
        instance = new RancherSingleServiceUtils({ ...RANCHER_INSTANCE_MOCK, image: 'someImage' });
        command = instance.forcePullUpgradeDeployment.bind(instance);
      });

      const args = [
        `--namespace=${RANCHER_INSTANCE_MOCK.namespace}`,
        'patch',
        'deployment',
        RANCHER_INSTANCE_MOCK.service,
        '--type=strategic',
        '-p',
        `{"spec":{"template":{"spec":{"containers":[{"name":"${RANCHER_INSTANCE_MOCK.service}","image":"someImage","env":[{"name":"FORCE_UPGRADE_BY","value":"${RANCHER_INSTANCE_MOCK.uniqueId}"}]}]}}}}`
      ];

      it('should call rancherExecute with proper arguments', async () => {
        await command();

        expect(rancherExecuteStub).to.have.been.calledWith('kubectl', args);
      });
    });
  });
});
