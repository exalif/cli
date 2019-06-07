'use strict';

const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');
chai.use(require('sinon-chai'));
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
const style = require('ansi-styles');

let proxyquireStrict = require('proxyquire').noCallThru();

let sandbox, RancherIngressUtils, consoleStub, rancherExecuteStub, withSpinnerStub, uuidv4Stub, loginStub, readFileStub, mkdirStub, writeFileStub, createNamespaceStub, copyCertificateStub, safeLoadStub, getRancherTargetStub, checkDeployOnClusterStub, displayStackResultStub;

const ingressTemplateReplaceMap = {
  INGRESS_CERT_ISSUER: 'issuer',
  NAMESPACE: 'namespace',
  INGRESS_NAME: 'name',
  INGRESS_HOST: 'host',
  INGRESS_BACKEND_NAME: 'backend',
  INGRESS_BACKEND_PORT: 'port',
  INGRESS_SSL_CERT_SECRET: 'cert',
}

const CONFIG = {
    name: 'Exalif CLI',
    templateDirectory: 'templates',
    templateDestinationDirectory: 'schemas',
    ingressTemplateReplaceMap,
    stackTemplateReplaceMap: {
      UNIQUE_ID: 'uniqueId',
      TAG: 'image',
      ...ingressTemplateReplaceMap
    }
}
const TARGET_SERVICE = 'deployment:SomeTargetService';
const INGRESS_NAME = 'ingress-testing';
const INGRESS = `{"issuer": "letsencrypt-prod", "name": "${INGRESS_NAME}", "host": "ingress-testing-com", "backend": "client", "port": 80, "cert": "ingress-testing-com-tls"}`;
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
  type: 'ingress',
  ingress: INGRESS
};

const INGRESS_DATA = `apiVersion: v1
kind: List
items:
- apiVersion: extensions/v1beta1
  kind: Ingress
  metadata:
    annotations:
      certmanager.k8s.io/cluster-issuer: INGRESS_CERT_ISSUER
      nginx.ingress.kubernetes.io/proxy-body-size: "0"
    name: INGRESS_NAME
    namespace: NAMESPACE
  spec:
    rules:
    - host: INGRESS_HOST
      http:
        paths:
        - backend:
            serviceName: INGRESS_BACKEND_NAME
            servicePort: INGRESS_BACKEND_PORT
    tls:
    - hosts:
      - INGRESS_HOST
      secretName: INGRESS_SSL_CERT_SECRET`;

const EXPECTED_INGRESS_REPLACED = `apiVersion: v1
kind: List
items:
- apiVersion: extensions/v1beta1
  kind: Ingress
  metadata:
    annotations:
      certmanager.k8s.io/cluster-issuer: letsencrypt-prod
      nginx.ingress.kubernetes.io/proxy-body-size: "0"
    name: ingress-testing
    namespace: someNamespace
  spec:
    rules:
    - host: ingress-testing-com
      http:
        paths:
        - backend:
            serviceName: client
            servicePort: 80
    tls:
    - hosts:
      - ingress-testing-com
      secretName: ingress-testing-com-tls`;

describe('RancherIngressUtils class', () => {
  beforeEach(() => {
    sandbox = sinon.createSandbox();

    consoleStub = sandbox.stub(console, 'log');
    rancherExecuteStub = sandbox.stub().resolves('executeOk');
    getRancherTargetStub = sandbox.stub().resolves('getRancherTargetOk');
    checkDeployOnClusterStub = sandbox.stub().resolves('checkDeployOnClusterOk');

    withSpinnerStub = sandbox.stub();
    loginStub = sandbox.stub().resolves();

    readFileStub = sandbox.stub().returns(INGRESS_DATA);
    mkdirStub = sandbox.stub();
    writeFileStub = sandbox.stub();

    RancherIngressUtils = proxyquireStrict('../../lib/rancher/ingress', {
      '../utils/withSpinner': withSpinnerStub,
      '../utils/utils': {
        rancherExecute: rancherExecuteStub,
        getRancherTarget: getRancherTargetStub,
      },
      './utils': {
        login: loginStub,
        checkDeployOnCluster: checkDeployOnClusterStub,
      },
      'fs': {
        readFileSync: readFileStub,
        mkdirSync: mkdirStub,
        writeFileSync: writeFileStub
      },
      '../../config/config': {
        config: CONFIG
      },
    });
  });

  afterEach(() => {
    sandbox.restore();
    RancherIngressUtils = require('../../lib/rancher/ingress');
  });

  describe('deployIngress', () => {
    let command, instance;

    describe('on success', () => {
      beforeEach(() => {
        instance = new RancherIngressUtils(RANCHER_INSTANCE_MOCK);

        withSpinnerStub.onCall(0).resolves(TARGET_SERVICE);
        instance.createIngressFile = sandbox.stub().resolves();
        instance.createIngressOnCluster = sandbox.stub().resolves();

        command = instance.deployIngress.bind(instance);
      });

      it('should call getRancherTarget', async () => {
        await command();

        const getRancherTargetArgs = withSpinnerStub.getCall(0).args[0];

        expect(getRancherTargetStub).to.have.been.called;
        expect(getRancherTargetArgs.textOnStart).to.equal(`[${INGRESS_NAME}] Checking target resource...`);
        expect(getRancherTargetArgs.spinnerType).to.equal(`arrow3`);
        expect(getRancherTargetArgs.textOnSuccess('someResult')).to.equal(`Target resource parsed: ${style.cyan.open}someResult${style.cyan.close} - Type: ${RANCHER_INSTANCE_MOCK.type}`);
        expect(getRancherTargetArgs.textOnError('someError')).to.equal(`someError`);
      });

      it('should call createIngressFile', async () => {
        await command();

        const createIngressFileArgs = withSpinnerStub.getCall(1).args[0];

        expect(instance.createIngressFile).to.have.been.called;
        expect(createIngressFileArgs.textOnStart).to.equal(`[${INGRESS_NAME}] Generating ingress template...`);
        expect(createIngressFileArgs.spinnerType).to.equal(`arrow3`);
        expect(createIngressFileArgs.textOnSuccess('someResult')).to.equal(`Ingress template generated: ${style.cyan.open}someResult${style.cyan.close}`);
        expect(createIngressFileArgs.textOnError('someError')).to.equal(`someError`);
      });

      it('should call login', async () => {
        await command();

        const loginArgs = withSpinnerStub.getCall(2).args[0];

        expect(loginStub).to.have.been.called;
        expect(loginArgs.textOnStart).to.equal(`[${INGRESS_NAME}] Login to orchestrator...`);
        expect(loginArgs.spinnerType).to.equal(`arrow3`);
        expect(loginArgs.textOnSuccess()).to.equal(`Login succeeded`);
        expect(loginArgs.textOnError('someError')).to.equal(`someError`);
      });

      it('should call createIngressOnCluster', async () => {
        await command();

        const createNamespaceArgs = withSpinnerStub.getCall(3).args[0];

        expect(instance.createIngressOnCluster).to.have.been.called;
        expect(createNamespaceArgs.textOnStart).to.equal(`[${INGRESS_NAME}] Deploying ingress on cluster. Please wait...`);
        expect(createNamespaceArgs.spinnerType).to.equal(`arrow3`);
        expect(createNamespaceArgs.textOnSuccess()).to.equal(`[${style.cyan.open}${INGRESS_NAME}${style.cyan.close}] Ingress was deployed on cluster.`);
        expect(createNamespaceArgs.textOnError('someError')).to.equal(`[${INGRESS_NAME}] Ingress deployment failed due to: someError`);
      });

      it('should call checkDeployOnCluster', async () => {
        await command();

        const checkDeployOnClusterArgs = withSpinnerStub.getCall(4).args[0];

        expect(checkDeployOnClusterStub).to.have.been.calledWith(TARGET_SERVICE);
        expect(checkDeployOnClusterArgs.textOnStart).to.equal(`[${INGRESS_NAME}] Retrieving state ...`);
        expect(checkDeployOnClusterArgs.spinnerType).to.equal(`arrow3`);
        expect(checkDeployOnClusterArgs.textOnSuccess('someResult')).to.equal(`[${style.cyan.open}${INGRESS_NAME}${style.cyan.close}] State was retrieved: ${style.green.open}someResult${style.green.close}`);
        expect(checkDeployOnClusterArgs.textOnError('someError')).to.equal(`[${INGRESS_NAME}] Checking upgrade failed. Please check in the orchestrator UI. someError`);
      });
    });

    describe('when an error occurs', () => {
      beforeEach(() => {
        instance = new RancherIngressUtils(RANCHER_INSTANCE_MOCK);

        withSpinnerStub.onSecondCall().throws('createIngressFileFail');

        command = instance.deployIngress.bind(instance);
      });

      it('should reject with error', async () => {
        await expect(command())
        .to.eventually.be.rejectedWith('createIngressFileFail');
      });
    });
  });

  describe('removeIngress', () => {
    let command, instance;

    describe('on success', () => {
      beforeEach(() => {
        instance = new RancherIngressUtils(RANCHER_INSTANCE_MOCK);

        instance.removeIngressFromCluster = sandbox.stub();

        withSpinnerStub.onFirstCall().resolves(TARGET_SERVICE);
        withSpinnerStub.onSecondCall().resolves('checkUpgradeResult');

        command = instance.removeIngress.bind(instance);
      });

      it('should call login', async () => {
        await command();

        const loginArgs = withSpinnerStub.getCall(0).args[0];

        expect(loginStub).to.have.been.called;
        expect(loginArgs.textOnStart).to.equal(`[${INGRESS_NAME}] Login to orchestrator...`);
        expect(loginArgs.spinnerType).to.equal(`arrow3`);
        expect(loginArgs.textOnSuccess()).to.equal(`Login succeeded`);
        expect(loginArgs.textOnError('someError')).to.equal(`someError`);
      });

      it('should call removeIngressFromCluster', async () => {
        await command();

        const removeIngressFromClusterArgs = withSpinnerStub.getCall(1).args[0];

        expect(instance.removeIngressFromCluster).to.have.been.called;
        expect(removeIngressFromClusterArgs.textOnStart).to.equal(`[${INGRESS_NAME}] Removing ingress from cluster. Please wait...`);
        expect(removeIngressFromClusterArgs.spinnerType).to.equal(`arrow3`);
        expect(removeIngressFromClusterArgs.textOnSuccess('someResult')).to.equal(`[${style.cyan.open}${INGRESS_NAME}${style.cyan.close}] Ingress was removed from cluster.`);
        expect(removeIngressFromClusterArgs.textOnError('someError')).to.equal(`[${INGRESS_NAME}] Ingress removal failed due to: someError`);
      });

      it('should resolve', async () => {
        await expect(command()).to.eventually.be.fulfilled;
      });
    });

    describe('when an error occurs', () => {
      beforeEach(() => {
        instance = new RancherIngressUtils(RANCHER_INSTANCE_MOCK);


        withSpinnerStub.onSecondCall().throws('removeIngressFail');

        command = instance.removeIngress.bind(instance);
      });

      it('should reject with error', async () => {
        await expect(command())
        .to.eventually.be.rejectedWith('removeIngressFail');
      });
    });
  });

  describe('createIngressFile', () => {
    describe('when everything succeeds', () => {
      let command, instance;

      beforeEach(() => {
        instance = new RancherIngressUtils(RANCHER_INSTANCE_MOCK);
        command = instance.createIngressFile.bind(instance);
      });

      it('should return data', async () => {
        await expect(command()).to.eventually.become(EXPECTED_INGRESS_REPLACED);
      });

      it('should call readfileSync, mkdirSync and writefileSync with proper arguments', async () => {
        await command();

        expect(readFileStub).to.have.been.calledWith('templates/ingress.yaml', 'utf8');

        expect(mkdirStub).to.have.callCount(1);
        expect(mkdirStub).to.have.been.calledWith('schemas', { recursive: true });

        expect(writeFileStub).to.have.callCount(1);
        expect(writeFileStub).to.have.been.calledWith('schemas/ingress.yaml', EXPECTED_INGRESS_REPLACED, 'utf8');
      });
    });

    describe('when read fails', () => {
      let command, instance;

      beforeEach(() => {
        readFileStub.callsFake(() => {
          throw 'readError'
        });

        instance = new RancherIngressUtils(RANCHER_INSTANCE_MOCK);
        command = instance.createIngressFile.bind(instance);
      });

      it('should reject with error', async () => {
        await expect(command()).to.eventually.be.rejectedWith('readError');
      });
    });

    describe('when mkdir fails', () => {
      let command, instance;

      beforeEach(() => {
        mkdirStub.callsFake(() => {
          throw 'mkdirError'
        });

        instance = new RancherIngressUtils(RANCHER_INSTANCE_MOCK);
        command = instance.createIngressFile.bind(instance);
      });

      it('should reject with error', async () => {
        await expect(command()).to.eventually.be.rejectedWith('mkdirError');
      });
    });

    describe('when writeFile fails', () => {
      let command, instance;

      beforeEach(() => {
        writeFileStub.callsFake(() => {
          throw 'writeFailError'
        });

        instance = new RancherIngressUtils(RANCHER_INSTANCE_MOCK);
        command = instance.createIngressFile.bind(instance);
      });

      it('should reject with error', async () => {
        await expect(command()).to.eventually.be.rejectedWith('writeFailError');
      });
    });

    describe('when fail with error name', () => {
      let command, instance;

      beforeEach(() => {
        writeFileStub.callsFake(() => {
          throw { name: 'errorName' };
        });

        instance = new RancherIngressUtils(RANCHER_INSTANCE_MOCK);
        command = instance.createIngressFile.bind(instance);
      });

      it('should reject with error', async () => {
        await expect(command()).to.eventually.be.rejectedWith('errorName');
      });
    });
  });

  describe('createIngressOnCluster', () => {
    let command, instance;

    beforeEach(() => {
      instance = new RancherIngressUtils(RANCHER_INSTANCE_MOCK);
      command = instance.createIngressOnCluster.bind(instance);
    });

    it('should execute command', async () => {
      await expect(command()).to.eventually.become('executeOk');
    });


    it('should call rancherExecute with proper arguments', async () => {
      const args = [
        'apply',
        '-f',
        `schemas/ingress.yaml`
      ];

      await command();

      expect(consoleStub).to.have.callCount(3);
      expect(consoleStub.getCall(2).args[0]).to.equal(`Executing kubectl ${args.join(' ')}`);
      expect(rancherExecuteStub).to.have.been.calledWith('kubectl', args);
    });
  });

  describe('removeIngressFromCluster', () => {
    let command, instance;

    beforeEach(() => {
      instance = new RancherIngressUtils(RANCHER_INSTANCE_MOCK);
      command = instance.removeIngressFromCluster.bind(instance);
    });

    it('should execute command', async () => {
      await expect(command()).to.eventually.become('executeOk');
    });


    it('should call rancherExecute with proper arguments', async () => {
      const args = [
        `delete`,
        'ingress',
        INGRESS_NAME,
        '-n',
        NAMESPACE
      ];

      await command();

      expect(consoleStub).to.have.callCount(3);
      expect(consoleStub.getCall(2).args[0]).to.equal(`Executing kubectl ${args.join(' ')}`);
      expect(rancherExecuteStub).to.have.been.calledWith('kubectl', args);
    });
  });
});
