'use strict';

const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');
chai.use(require('sinon-chai'));
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
const style = require('ansi-styles');

let proxyquireStrict = require('proxyquire').noCallThru();

let sandbox, RancherStackUtils, consoleStub, rancherExecuteStub, withSpinnerStub, uuidv4Stub, loginStub, readFileStub, mkdirStub, writeFileStub, createNamespaceStub, copyCertificateStub, safeLoadStub, getRancherTargetStub, checkDeployOnClusterStub, displayStackResultStub;

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
  },
  checkDeployTypes: ['ingress', 'deployment'],
}
const TARGET_SERVICE = 'deployment:SomeTargetService';
const UUID = 'SomeMagicgv4';
const UUID_SECOND = 'SomeMagicgv4second';
const INGRESS_DATA = `apiVersion: v1
kind: List
items:
- apiVersion: extensions/v1beta1
  kind: Ingress
  metadata:
    annotations:
      certmanager.k8s.io/cluster-issuer: INGRESS_CERT_ISSUER
      nginx.ingress.kubernetes.io/proxy-body-size: "0"
      random-nb: UUID
      another-nb-for-fun: UUID
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
      random-nb: ${UUID}
      another-nb-for-fun: ${UUID_SECOND}
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

const NAMESPACE = 'someNamespace';
const STACKFILE = 'someStackFile.yaml'
const STACKTEMPLATE = 'stack/path/' + STACKFILE;
const RANCHER_INSTANCE_MOCK = {
  orchestratorUrl: 'someUrl',
  apiUrl: 'someUrl/v3',
  orchestratorAccessKey: 'someAccessKey',
  orchestratorSecretKey: 'someSecretKey',
  projectId: 'someProjectId',
  loginToken: 'someAccessKey:someSecretKey',
  force: false,
  namespace: NAMESPACE,
  stackFile: STACKFILE,
  service: 'someService',
  verbose: false,
};
const RANCHER_INSTANCE_VERBOSE = {
  ...RANCHER_INSTANCE_MOCK,
  verbose: true
}

const INGRESS = '{"issuer": "letsencrypt-prod", "name": "ingress-testing", "host": "ingress-testing-com", "backend": "client", "port": 80, "cert": "ingress-testing-com-tls"}';

const DATA = 'some data';

describe('RancherStackUtils class', () => {
  beforeEach(() => {
    sandbox = sinon.createSandbox();

    consoleStub = sandbox.stub(console, 'log');
    rancherExecuteStub = sandbox.stub().resolves('executeOk');
    getRancherTargetStub = sandbox.stub().resolves('getRancherTargetOk');
    checkDeployOnClusterStub = sandbox.stub().resolves('checkDeployOnClusterOk');
    displayStackResultStub = sandbox.stub().callsFake(results => console.log(JSON.stringify(results)));

    withSpinnerStub = sandbox.stub();
    loginStub = sandbox.stub().resolves();
    createNamespaceStub = sandbox.stub().resolves();
    copyCertificateStub = sandbox.stub().resolves();

    safeLoadStub = sandbox.stub().returns({
      items: [
        {
          kind: 'Ingress',
          metadata: {
            name: 'ingress-testing'
          }
        },
        {
          kind: 'ConfigMap',
          metadata: {
            name: 'config-map-testing'
          }
        }
      ]
    });

    readFileStub = sandbox.stub().callsFake((file, enc) => {
      if (file.includes('fail')) {
        throw 'readError';
      } else if (file.includes('ingress')) {
        return INGRESS_DATA;
      } else {
        return DATA;
      }
    });
    mkdirStub = sandbox.stub();
    writeFileStub = sandbox.stub();

    uuidv4Stub = sandbox.stub()
    uuidv4Stub.onCall(0).returns(UUID);
    uuidv4Stub.onCall(1).returns(UUID_SECOND);

    RancherStackUtils = proxyquireStrict('../../lib/rancher/stack', {
      '../utils/withSpinner': withSpinnerStub,
      '../utils/utils': {
        rancherExecute: rancherExecuteStub,
        getRancherTarget: getRancherTargetStub,
      },
      './utils': {
        login: loginStub,
        createNamespace: createNamespaceStub,
        copyCertificate: copyCertificateStub,
        checkDeployOnCluster: checkDeployOnClusterStub,
        displayStackResult: displayStackResultStub,
      },
      'fs': {
        readFileSync: readFileStub,
        mkdirSync: mkdirStub,
        writeFileSync: writeFileStub
      },
      '../../config/config': {
        config: CONFIG
      },
      'uuid': {
        v4: uuidv4Stub,
      },
      'js-yaml': {
        safeLoad: safeLoadStub
      }
    });
  });

  afterEach(() => {
    sandbox.restore();
    RancherStackUtils = require('../../lib/rancher/stack');
  });

  describe('deployStack', () => {
    let command, instance;

    beforeEach(() => {
      instance = new RancherStackUtils(RANCHER_INSTANCE_MOCK);
      instance.stackTemplate = STACKTEMPLATE;

      withSpinnerStub.onFirstCall().resolves(EXPECTED_INGRESS_REPLACED);
      instance.createStackTemplateWithReplacedValues = sandbox.stub().resolves(EXPECTED_INGRESS_REPLACED);
      instance.createStackOnCluster = sandbox.stub().resolves();
      instance.checkStackDeploy = sandbox.stub().resolves();

      command = instance.deployStack.bind(instance);
    });

    describe('when on verbose mode', () => {
      beforeEach(() => {
        instance = new RancherStackUtils(RANCHER_INSTANCE_VERBOSE);
        instance.stackTemplate = STACKTEMPLATE;

        withSpinnerStub.onFirstCall().resolves(EXPECTED_INGRESS_REPLACED);
        instance.createStackTemplateWithReplacedValues = sandbox.stub().resolves(EXPECTED_INGRESS_REPLACED);
        instance.createStackOnCluster = sandbox.stub().resolves();
        instance.checkStackDeploy = sandbox.stub().resolves();

        command = instance.deployStack.bind(instance);
      });

      it('should display generated stack', async () => {
        await command();

        const createStackTemplateArgs = withSpinnerStub.getCall(0).args[0];
        expect(createStackTemplateArgs.textOnSuccess('someResult')).to.equal(`[someStackFile.yaml] Stack template generated: \n${style.cyan.open}someResult${style.cyan.close}`);
      });
    });

    it('should call createStackTemplate', async () => {
      await command();

      const createStackTemplateArgs = withSpinnerStub.getCall(0).args[0];

      expect(instance.createStackTemplateWithReplacedValues).to.have.been.called;
      expect(createStackTemplateArgs.textOnStart).to.equal(`[${STACKFILE}] Generating stack template...`);
      expect(createStackTemplateArgs.spinnerType).to.equal(`arrow3`);
      expect(createStackTemplateArgs.textOnSuccess('someResult')).to.equal(`[someStackFile.yaml] Stack template generated`);
      expect(createStackTemplateArgs.textOnError('someError')).to.equal(`someError`);
    });

    it('should call login', async () => {
      await command();

      const loginArgs = withSpinnerStub.getCall(1).args[0];

      expect(loginStub).to.have.been.called;
      expect(loginArgs.textOnStart).to.equal(`[${STACKTEMPLATE}] Login to orchestrator...`);
      expect(loginArgs.spinnerType).to.equal(`arrow3`);
      expect(loginArgs.textOnSuccess()).to.equal(`Login succeeded`);
      expect(loginArgs.textOnError('someError')).to.equal(`someError`);
    });

    it('should call createNamespace', async () => {
      await command();

      const createNamespaceArgs = withSpinnerStub.getCall(2).args[0];

      expect(createNamespaceStub).to.have.been.called;
      expect(createNamespaceArgs.textOnStart).to.equal(`[${NAMESPACE}] Creating namespace if not existing...`);
      expect(createNamespaceArgs.spinnerType).to.equal(`arrow3`);
      expect(createNamespaceArgs.textOnSuccess()).to.equal(`Namespace created/exists`);
      expect(createNamespaceArgs.textOnError('someError')).to.equal(`someError`);
    });

    it('should call copyCertificate', async () => {
      await command();

      const copyCertificateArgs = withSpinnerStub.getCall(3).args[0];

      expect(copyCertificateStub).to.have.been.called;
      expect(copyCertificateArgs.textOnStart).to.equal(`[${NAMESPACE}] Copying required certs...`);
      expect(copyCertificateArgs.spinnerType).to.equal(`arrow3`);
      expect(copyCertificateArgs.textOnSuccess('someResult')).to.equal(`someResult`);
      expect(copyCertificateArgs.textOnError('someError')).to.equal(`someError`);
    });

    it('should call createStackOnCluster', async () => {
      await command();

      const createStackOnClusterArgs = withSpinnerStub.getCall(4).args[0];

      expect(instance.createStackOnCluster).to.have.been.called;
      expect(createStackOnClusterArgs.textOnStart).to.equal(`[${STACKTEMPLATE}] Deploying stack on cluster. Please wait...`);
      expect(createStackOnClusterArgs.spinnerType).to.equal(`arrow3`);
      expect(createStackOnClusterArgs.textOnSuccess()).to.equal(`[${style.cyan.open}${STACKTEMPLATE}${style.cyan.close}] Stack was deployed on cluster.`);
      expect(createStackOnClusterArgs.textOnError('someError')).to.equal(`[${STACKTEMPLATE}] Stack deployment failed due to: someError`);
    });

    it('should call checkStackDeploy', async () => {
      await command();

      const checkStackDeployArgs = withSpinnerStub.getCall(5).args[0];

      expect(instance.checkStackDeploy).to.have.been.calledWith(EXPECTED_INGRESS_REPLACED);
      expect(checkStackDeployArgs.textOnStart).to.equal(`[${STACKTEMPLATE}] Retrieving state ...`);
      expect(checkStackDeployArgs.spinnerType).to.equal(`arrow3`);
      expect(checkStackDeployArgs.textOnSuccess('someResult')).to.equal(`[${style.cyan.open}${STACKTEMPLATE}${style.cyan.close}] State was retrieved: ${style.green.open}someResult${style.green.close}`);
      expect(checkStackDeployArgs.textOnError('someError')).to.equal(`[${STACKTEMPLATE}] Checking upgrade failed. Please check in the orchestrator UI. someError`);
    });
  });

  describe('checkStackDeploy', () => {
    let command, instance;

    describe('on success', () => {
      beforeEach(() => {
        instance = new RancherStackUtils(RANCHER_INSTANCE_MOCK);
        instance.stackTemplate = STACKTEMPLATE;

        withSpinnerStub.onFirstCall().resolves(TARGET_SERVICE);
        withSpinnerStub.onSecondCall().resolves('checkUpgradeResult');

        command = instance.checkStackDeploy.bind(instance);
      });

      it('should call safeLoadStub', async () => {
        await command(EXPECTED_INGRESS_REPLACED);

        expect(safeLoadStub).to.have.been.calledWith(EXPECTED_INGRESS_REPLACED);
      });

      it('should check target only for ingress or deployment', async () => {
        await command();

        expect(getRancherTargetStub).to.have.callCount(1);
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

      it('should call checkDeployOnCluster', async () => {
        await command();

        const checkDeployOnClusterArgs = withSpinnerStub.getCall(1).args[0];

        expect(checkDeployOnClusterStub).to.have.been.calledWith(TARGET_SERVICE);
        expect(checkDeployOnClusterArgs.textOnStart).to.equal(`[${TARGET_SERVICE}] Retrieving state ...`);
        expect(checkDeployOnClusterArgs.spinnerType).to.equal(`arrow3`);
        expect(checkDeployOnClusterArgs.textOnSuccess('someResult')).to.equal(`[${style.cyan.open}${TARGET_SERVICE}${style.cyan.close}] State was retrieved: ${style.green.open}someResult${style.green.close}`);
        expect(checkDeployOnClusterArgs.textOnError('someError')).to.equal(`[${TARGET_SERVICE}] Checking upgrade failed. Please check in the orchestrator UI. someError`);
      });

      it('should call console log', async () => {
        await command();

        expect(consoleStub.getCall(2).args[0]).to.equal('Tasks deployed with results:');
        expect(consoleStub.getCall(3).args[0]).to.deep.equal(`[{"service":"${TARGET_SERVICE}","result":"checkUpgradeResult"}]`);
      });

      it('should return ok', async () => {
        await expect(command()).to.eventually.become('OK');
      });
    });

    describe('when an error occurs', () => {
      beforeEach(() => {
        instance = new RancherStackUtils(RANCHER_INSTANCE_MOCK);
        instance.stackTemplate = STACKTEMPLATE;

        withSpinnerStub.onFirstCall().resolves(TARGET_SERVICE);
        withSpinnerStub.onSecondCall().throws('checkUpgradeFail');

        command = instance.checkStackDeploy.bind(instance);
      });

      it('should reject with error', async () => {
        await expect(command())
        .to.eventually.be.rejectedWith('checkUpgradeFail');
      });
    });
  });

  describe('createStackOnCluster', () => {
    let command, instance;

    beforeEach(() => {
      instance = new RancherStackUtils(RANCHER_INSTANCE_MOCK);
      instance.stackTemplate = STACKTEMPLATE;
      command = instance.createStackOnCluster.bind(instance);
    });

    it('should execute getServiceUpgradePayload command', async () => {
      await expect(command()).to.eventually.become('executeOk');
    });


    it('should call rancherExecute with proper arguments', async () => {
      const args = [
        'apply',
        '-f',
        STACKTEMPLATE
      ];

      await command();

      expect(consoleStub).to.have.callCount(2);
      expect(consoleStub.getCall(1).args[0]).to.equal(`Executing kubectl apply -f ${STACKTEMPLATE}`);
      expect(rancherExecuteStub).to.have.been.calledWith('kubectl', args);
    });
  });

  describe('createStackTemplateWithReplacedValues', () => {
    describe('when everything succeeds', () => {
      describe('with no replacements', () => {
        let command, instance;

        beforeEach(() => {
          instance = new RancherStackUtils(RANCHER_INSTANCE_MOCK);
          command = instance.createStackTemplateWithReplacedValues.bind(instance);
        });

        it('should return data', async () => {
          await expect(command()).to.eventually.become(DATA);
        });

        it('should call readfileSync, mkdirSync and writefileSync with proper arguments', async () => {
          await command();

          expect(readFileStub).to.have.been.calledWith('someStackFile.yaml', 'utf8');

          expect(mkdirStub).to.have.callCount(1);
          expect(mkdirStub).to.have.been.calledWith('schemas', { recursive: true });

          expect(writeFileStub).to.have.callCount(1);
          expect(writeFileStub).to.have.been.calledWith('schemas/someStackFile.yaml', DATA, 'utf8');
        });
      });

      describe('with replacements', () => {
        let command, instance;

        beforeEach(() => {
          instance = new RancherStackUtils({ ...RANCHER_INSTANCE_MOCK, stackFile: 'ingress.yaml', ingress: INGRESS });
          command = instance.createStackTemplateWithReplacedValues.bind(instance);
        });

        it('should return data', async () => {
          await expect(command()).to.eventually.become(EXPECTED_INGRESS_REPLACED);
        });
      });
    });

    describe('when write fails', () => {
      let command, instance;

      beforeEach(() => {
        instance = new RancherStackUtils({ ...RANCHER_INSTANCE_MOCK, stackFile: 'failedFile.yaml' });
        command = instance.createStackTemplateWithReplacedValues.bind(instance);
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

        instance = new RancherStackUtils(RANCHER_INSTANCE_MOCK);
        command = instance.createStackTemplateWithReplacedValues.bind(instance);
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

        instance = new RancherStackUtils(RANCHER_INSTANCE_MOCK);
        command = instance.createStackTemplateWithReplacedValues.bind(instance);
      });

      it('should reject with error', async () => {
        await expect(command()).to.eventually.be.rejectedWith('writeFailError');
      });
    });

    describe('when fail with error code of ENOENT', () => {
      let command, instance;

      beforeEach(() => {
        writeFileStub.callsFake(() => {
          throw { code: 'ENOENT', path: 'somePath' };
        });

        instance = new RancherStackUtils(RANCHER_INSTANCE_MOCK);
        command = instance.createStackTemplateWithReplacedValues.bind(instance);
      });

      it('should reject with error', async () => {
        await expect(command()).to.eventually.be.rejectedWith('ENOENT - Cannot read: somePath');
      });
    });
  });
});
