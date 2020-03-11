'use strict';

const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');
chai.use(require('sinon-chai'));
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
const style = require('ansi-styles');

let proxyquireStrict = require('proxyquire').noCallThru();

let sandbox, rancher, consoleStub, getDefaultFromStringOrJsonStub, uuidv4Stub;

const UUID = 'someUUID';
const DEFAULT_OBJECT_VALID = {
  orchestratorUrl: 'someUrl',
  orchestratorAccessKey: 'someAccessKey',
  orchestratorSecretKey: 'someSecretKey',
  projectId: 'someProjectId',
  namespace: 'someNamespace',
  force: false,
  createNonExistingNamespace: false,
  stackFile: 'some/stack/file.yml'
}
const WITH_IMAGE = { ...DEFAULT_OBJECT_VALID, image: 'someDockerImage' };
const WITH_SERVICE_LIST = { ...DEFAULT_OBJECT_VALID, servicesList: ['service1', 'service2'] };
const WITH_IMAGE_LIST = { ...DEFAULT_OBJECT_VALID, imagesList: ['image1', 'image2'] };
const WITH_INGRESS = { ...DEFAULT_OBJECT_VALID, ingress: '{ "some": "ingressValue" }', certFrom: 'somewhere' };
const WITH_EXEC_COMMAND = { ...DEFAULT_OBJECT_VALID, execCommand: 'backup something' };

const CONFIGURATION_MESSAGE = `Orchestrator configured with:
    - url: ${style.bold.open}${DEFAULT_OBJECT_VALID.orchestratorUrl}${style.bold.close}
    - access-key: ${style.bold.open}${DEFAULT_OBJECT_VALID.orchestratorAccessKey}${style.bold.close}
    - secret-key: ${style.red.open}top secret ye parrot lover!${style.red.close}
    - project-id: ${style.bold.open}${DEFAULT_OBJECT_VALID.projectId}${style.bold.close}
    - unique-id (deployment): ${style.bold.open}${UUID}${style.bold.close}
    - namespace: ${style.bold.open}${DEFAULT_OBJECT_VALID.namespace}${style.bold.close}`;

describe('rancher class', () => {
  beforeEach(() => {
    sandbox = sinon.createSandbox();

    consoleStub = sandbox.stub(console, 'log');
    getDefaultFromStringOrJsonStub = sandbox.stub().callsFake((value, def) => {
      if (!value) {
        return !!def ? def : null;
      } else {
        return value;
      }
    });

    uuidv4Stub = sandbox.stub().returns(UUID)

    rancher = proxyquireStrict('../../lib/rancher/rancher', {
      '../utils/utils': {
        getDefaultFromStringOrJson: getDefaultFromStringOrJsonStub
      },
      'uuid': {
        v4: uuidv4Stub
      },
    });
  });

  afterEach(() => {
    sandbox.restore();
    rancher = require('../../lib/rancher/rancher');
  });

  describe('class instanciation', () => {
    describe('when no argument is provided', () => {
      let instance;

      beforeEach(() => {
        instance = new rancher();
      });

      it('should have default values', () => {
        expect(instance.uniqueId).to.equal(UUID);
        expect(instance.createNonExistingNamespace).to.equal(true);

        expect(instance.orchestratorUrl).to.equal(null);
        expect(instance.orchestratorAccessKey).to.equal(null);
        expect(instance.orchestratorSecretKey).to.equal(null);
        expect(instance.projectId).to.equal(null);
        expect(instance.namespace).to.equal(null);
        expect(instance.service).to.equal(null);
        expect(instance.servicesList).to.deep.equal([]);
        expect(instance.imagesList).to.deep.equal([]);
        expect(instance.image).to.deep.equal(null);
        expect(instance.ingress).to.deep.equal(null);
        expect(instance.force).to.deep.equal(null);
        expect(instance.stackFile).to.deep.equal(null);
        expect(instance.certFrom).to.deep.equal(null);
        expect(instance.execCommand).to.deep.equal(null);
      });
    });

    describe('when empty object is provided as argument', () => {
      let instance;

      beforeEach(() => {
        instance = new rancher({});
      });

      it('should have default values', () => {
        expect(instance.uniqueId).to.equal(UUID);
        expect(instance.createNonExistingNamespace).to.equal(true);

        expect(instance.orchestratorUrl).to.equal(null);
        expect(instance.orchestratorAccessKey).to.equal(null);
        expect(instance.orchestratorSecretKey).to.equal(null);
        expect(instance.projectId).to.equal(null);
        expect(instance.namespace).to.equal(null);
        expect(instance.service).to.equal(null);
        expect(instance.servicesList).to.deep.equal([]);
        expect(instance.imagesList).to.deep.equal([]);
        expect(instance.image).to.deep.equal(null);
        expect(instance.ingress).to.deep.equal(null);
        expect(instance.force).to.deep.equal(null);
        expect(instance.stackFile).to.deep.equal(null);
        expect(instance.certFrom).to.deep.equal(null);
        expect(instance.execCommand).to.deep.equal(null);
      });
    });

    describe('with a valid object is provided as argument', () => {
      let instance;

      beforeEach(() => {
        instance = new rancher(DEFAULT_OBJECT_VALID);
      });

      it('should have default values assigned to this', () => {
        expect(instance.uniqueId).to.equal(UUID);
        expect(instance.type).to.equal('deployment');
        expect(instance.apiUrl).to.equal(`${DEFAULT_OBJECT_VALID.orchestratorUrl}/v3`);
        expect(instance.orchestratorUrl).to.equal(`${DEFAULT_OBJECT_VALID.orchestratorUrl}`);
        expect(instance.orchestratorAccessKey).to.equal(`${DEFAULT_OBJECT_VALID.orchestratorAccessKey}`);
        expect(instance.orchestratorSecretKey).to.equal(`${DEFAULT_OBJECT_VALID.orchestratorSecretKey}`);
        expect(instance.loginToken).to.equal( `${DEFAULT_OBJECT_VALID.orchestratorAccessKey}:${DEFAULT_OBJECT_VALID.orchestratorSecretKey}`)
        expect(instance.projectId).to.equal(`${DEFAULT_OBJECT_VALID.projectId}`);
        expect(instance.namespace).to.equal(`${DEFAULT_OBJECT_VALID.namespace}`);
        expect(instance.force).to.equal(DEFAULT_OBJECT_VALID.force);
        expect(instance.createNonExistingNamespace).to.equal(DEFAULT_OBJECT_VALID.createNonExistingNamespace);
        expect(instance.stackFile).to.equal(`${DEFAULT_OBJECT_VALID.stackFile}`);
      });

      it('should call console log with proper configuration summary', () => {
        expect(consoleStub).to.have.callCount(1);
        expect(consoleStub).to.have.been.calledWith(CONFIGURATION_MESSAGE);
      });
    });

    describe('when providing an image', () => {
      let instance;

      beforeEach(() => {
        instance = new rancher(WITH_IMAGE);
      });

      it('should have image values assigned to this', () => {
        expect(instance.image).to.equal(WITH_IMAGE.image);
      });

      it('should call console log with proper configuration summary and image', () => {
        expect(consoleStub).to.have.callCount(2);
        expect(consoleStub).to.have.been.calledWith(CONFIGURATION_MESSAGE);
        expect(consoleStub).to.have.been.calledWith(`    - image: ${style.bold.open}${WITH_IMAGE.image}${style.bold.close}`);
      });
    });

    describe('when providing servicesList', () => {
      let instance;

      beforeEach(() => {
        instance = new rancher(WITH_SERVICE_LIST);
      });

      it('should have servicesList values assigned to this', () => {
        expect(instance.servicesList).to.equal(WITH_SERVICE_LIST.servicesList);
      });

      it('should call console log with proper configuration summary and servicesList', () => {
        expect(consoleStub).to.have.callCount(2);
        expect(consoleStub).to.have.been.calledWith(CONFIGURATION_MESSAGE);
        expect(consoleStub).to.have.been.calledWith(`    - services: ${style.bold.open}${WITH_SERVICE_LIST.servicesList.join(', ')}${style.bold.close}`);
      });
    });

    describe('when providing servicesList', () => {
      let instance;

      beforeEach(() => {
        instance = new rancher(WITH_IMAGE_LIST);
      });

      it('should have imagesList values assigned to this', () => {
        expect(instance.imagesList).to.equal(WITH_IMAGE_LIST.imagesList);
      });

      it('should call console log with proper configuration summary and servicesList', () => {
        expect(consoleStub).to.have.callCount(2);
        expect(consoleStub).to.have.been.calledWith(CONFIGURATION_MESSAGE);
        expect(consoleStub).to.have.been.calledWith(`    - images: ${style.bold.open}${WITH_IMAGE_LIST.imagesList.join(', ')}${style.bold.close}`);
      });
    });

    describe('when provinding an ingress', () => {
      let instance;

      beforeEach(() => {
        instance = new rancher(WITH_INGRESS);
      });

      it('should have ingress and type values assigned to this accordingly', () => {
        expect(instance.ingress).to.equal(WITH_INGRESS.ingress);
        expect(instance.type).to.equal(`ingress`);
        expect(instance.certFrom).to.equal(WITH_INGRESS.certFrom);
      });

      it('should call console log with proper configuration summary and servicesList', () => {
        expect(consoleStub).to.have.callCount(2);
        expect(consoleStub).to.have.been.calledWith(CONFIGURATION_MESSAGE);
        expect(consoleStub).to.have.been.calledWith(`    - ingress details: ${style.bold.open}${JSON.stringify(WITH_INGRESS.ingress)}${style.bold.close}`);
      });
    });

    describe('when provinding an exec command', () => {
      let instance;

      beforeEach(() => {
        instance = new rancher(WITH_EXEC_COMMAND);
      });

      it('should have execCommand values assigned to this', () => {
        expect(instance.execCommand).to.equal(WITH_EXEC_COMMAND.execCommand);
      });

      it('should call console log with proper configuration summary and servicesList', () => {
        expect(consoleStub).to.have.callCount(2);
        expect(consoleStub).to.have.been.calledWith(CONFIGURATION_MESSAGE);
        expect(consoleStub).to.have.been.calledWith(`    - executed command: ${style.bold.open}${JSON.stringify(WITH_EXEC_COMMAND.execCommand)}${style.bold.close}`);
      });
    });
  });
});
