'use strict';

const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');
chai.use(require('sinon-chai'));
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
const style = require('ansi-styles');

let proxyquireStrict = require('proxyquire').noCallThru();

let sandbox, RancherSingleServiceUtils, consoleStub, rancherExecuteStub, withSpinnerStub, loginStub, inspectPodsInProjectStub, checkStateBeforeUpgradeStub, getRancherTargetStub, checkDeployOnClusterStub, displayStackResultStub;

const TARGET_SERVICE = 'deployment:SomeTargetService';
const FIND_POD_RESULT = {
  data: [{
    name: 'someService'
  }, {
    name: 'someServiceTwo'
  }]
};
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
  execCommand: 'some command',
  type: 'deployment'
}

describe('RancherSingleServiceUtils class', () => {
  beforeEach(() => {
    sandbox = sinon.createSandbox();

    consoleStub = sandbox.stub(console, 'log');
    rancherExecuteStub = sandbox.stub().resolves('executeOk');
    getRancherTargetStub = sandbox.stub().resolves('getRancherTargetOk');
    inspectPodsInProjectStub = sandbox.stub().resolves('inspectPodsInProjectOk')
    checkDeployOnClusterStub = sandbox.stub().resolves('checkDeployOnClusterOk');
    checkStateBeforeUpgradeStub = sandbox.stub().resolves('checkStateBeforeUpgradeOk')
    displayStackResultStub = sandbox.stub().callsFake(results => console.log(JSON.stringify(results)));

    withSpinnerStub = sandbox.stub();
    loginStub = sandbox.stub().resolves();

    RancherSingleServiceUtils = proxyquireStrict('../../lib/rancher/exec', {
      '../utils/withSpinner': withSpinnerStub,
      '../utils/utils': {
        rancherExecute: rancherExecuteStub,
        getRancherTarget: getRancherTargetStub,
      },
      './utils': {
        login: loginStub,
        inspectPodsInProject: inspectPodsInProjectStub,
      },
    });
  });

  afterEach(() => {
    sandbox.restore();
    RancherSingleServiceUtils = require('../../lib/rancher/exec');
  });

  describe('runCommand', () => {
    let command, instance;

    describe('on success', () => {
      beforeEach(() => {
        instance = new RancherSingleServiceUtils(RANCHER_INSTANCE_MOCK);

        instance.executeCommandOnPod = sinon.stub();

        withSpinnerStub.onCall(0).resolves(TARGET_SERVICE);
        withSpinnerStub.onCall(2).resolves(FIND_POD_RESULT);
        withSpinnerStub.onCall(5).resolves(CHECK_UPGRADE_RESULT)

        command = instance.runCommand.bind(instance);
      });

      it('should resolve', async () => {
        await expect(command()).to.eventually.be.fulfilled;
      });

      it('should call getRancherTarget', async () => {
        await command();

        const getRancherTargetArgs = withSpinnerStub.getCall(0).args[0];

        expect(getRancherTargetStub).to.have.been.called;
        expect(getRancherTargetArgs.textOnStart).to.equal(`[${RANCHER_INSTANCE_MOCK.service}] Checking target service...`);
        expect(getRancherTargetArgs.spinnerType).to.equal(`arrow3`);
        expect(getRancherTargetArgs.textOnSuccess('someResult')).to.equal(`Target service parsed: ${style.cyan.open}someResult${style.cyan.close} - Type: ${RANCHER_INSTANCE_MOCK.type}`);
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

      it('should call inspectPodsInProject', async () => {
        await command();

        const inspectPodsInProjectArgs = withSpinnerStub.getCall(2).args[0];

        expect(inspectPodsInProjectStub).to.have.been.calledWith(TARGET_SERVICE);
        expect(inspectPodsInProjectArgs.textOnStart).to.equal(`[${RANCHER_INSTANCE_MOCK.service}] Retrieving state ...`);
        expect(inspectPodsInProjectArgs.spinnerType).to.equal(`arrow3`);
        expect(inspectPodsInProjectArgs.textOnSuccess(FIND_POD_RESULT)).to.equal(`[${style.cyan.open}${RANCHER_INSTANCE_MOCK.service}${style.cyan.close}] Retrieved pod: ${style.green.open}${FIND_POD_RESULT.data[0].name}${style.green.close}`);
        expect(inspectPodsInProjectArgs.textOnError('someError')).to.equal(`[${RANCHER_INSTANCE_MOCK.service}] Checking resource failed. Please check in the orchestrator UI. someError`);
      });

      it('should call executeCommandOnPod', async () => {
        await command();

        const executeCommandOnPodArgs = withSpinnerStub.getCall(3).args[0];

        expect(instance.executeCommandOnPod).to.have.been.called;
        expect(executeCommandOnPodArgs.textOnStart).to.equal(`[${RANCHER_INSTANCE_MOCK.service}] Executing command ${style.green.open}${RANCHER_INSTANCE_MOCK.execCommand}${style.green.close} on pod ${style.green.open}${RANCHER_INSTANCE_MOCK.service}${style.green.close}. Please wait...`);
        expect(executeCommandOnPodArgs.spinnerType).to.equal(`arrow3`);
        expect(executeCommandOnPodArgs.textOnSuccess('someResult')).to.equal(`[${style.cyan.open}${RANCHER_INSTANCE_MOCK.service}${style.cyan.close}] Command ${style.green.open}${RANCHER_INSTANCE_MOCK.execCommand}${style.green.close} was properly executed on pod ${style.green.open}${RANCHER_INSTANCE_MOCK.service}${style.green.close} with results:\nsomeResult.`);
        expect(executeCommandOnPodArgs.textOnError('someError')).to.equal(`[${RANCHER_INSTANCE_MOCK.service}] Execution of command failed due to: someError`);
      });
    });

    describe('when an error occurs', () => {
      beforeEach(() => {
        instance = new RancherSingleServiceUtils(RANCHER_INSTANCE_MOCK);

        withSpinnerStub.onFirstCall().resolves(TARGET_SERVICE);
        withSpinnerStub.onSecondCall().throws('checkUpgradeFail');

        command = instance.runCommand.bind(instance);
      });

      it('should reject with error', async () => {
        await expect(command())
        .to.eventually.be.rejectedWith('checkUpgradeFail');
      });
    });
  });

  describe('extractPodInList', () => {
    let instance;

    beforeEach(() => {
      instance = new RancherSingleServiceUtils(RANCHER_INSTANCE_MOCK);
    });

    it('should extract first pod matching name', () => {
      expect(instance.extractPodInList(FIND_POD_RESULT.data)).to.equal(FIND_POD_RESULT.data[0].name)
    });
  });

  describe('executeCommandOnPod', () => {
    let command, instance;

    const args = [
      `exec`,
      RANCHER_INSTANCE_MOCK.service,
      '-n',
      NAMESPACE,
      '--',
      ...RANCHER_INSTANCE_MOCK.execCommand.split(' ')
    ];

    beforeEach(() => {
      instance = new RancherSingleServiceUtils(RANCHER_INSTANCE_MOCK);
      command = instance.executeCommandOnPod.bind(instance);
    });

    it('should execute inspectPodsInProject command', async () => {
      await expect(command(RANCHER_INSTANCE_MOCK.service)).to.eventually.become('executeOk');
    });

    it('should call console log', async () => {
      await command(RANCHER_INSTANCE_MOCK.service);

      expect(consoleStub).to.have.callCount(3);
      expect(consoleStub.getCall(2).args[0]).to.equal(`Executing kubectl ${args.join(' ')}`);
    });

    it('should call rancherExecute with proper arguments', async () => {
      await command(RANCHER_INSTANCE_MOCK.service);

      expect(rancherExecuteStub).to.have.been.calledWith('kubectl', args);
    });
  });
});
