'use strict';

const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');
chai.use(require('sinon-chai'));
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);

const shell = require('../../lib/utils/shell');
const Utils = require('../../lib/utils/utils');

const VALID_JSON_OBJECT = '{"some": { "json": "value" }}';
const INVALID_JSON_OBJECT = '{ "some": { "json": "value }}';
const NAMESPACE = 'someNamespace';
const INGRESS_SERVICE_TYPE = 'ingress';
const SERVICE = 'someService';
const INGRESS = {
  name: 'someIngressName'
}
const EXPECTED_RANCHER_TARGET_REJECT_MESSAGE = 'You must specify a namespace and a target name';
const EXPECTED_SERVICE_TARGET = `${NAMESPACE}:${SERVICE}`
class MockClass {
  constructor(namespace = null, service = null, type = null, ingress = {}) {
    Object.assign(this, {
      namespace, service,
      type, ingress
    });
  }
}

let sandbox, shellStub;

describe('Leaf util', () => {
  const obj = {
    id: 'some-_id',
    sub: {
      foo: 'bar',
      baz: {
        key: 'value',
        someEmpty: ''
      }
    }
  };

  it('should pick first level value from object', () => {
    const res = Utils.leaf(obj, 'id');

    expect(res).to.equal('some-_id');
  });

  it('should pick second level value from object', () => {
    const res = Utils.leaf(obj, 'sub.foo');

    expect(res).to.equal('bar');
  });

  it('should pick third level value from object', () => {
    const res = Utils.leaf(obj, 'sub.baz.key');

    expect(res).to.equal('value');
  });

  it('should return null when final result is an empty string', () => {
    const res = Utils.leaf(obj, 'sub.baz.someEmpty');

    expect(res).to.equal('');
  });
});

describe('getRancherTarchet util', () => {
  let mockClass, promise;

  beforeEach(() => {
    mockClass = promise = null;
  });

  describe('when there is no namespace', () => {
    beforeEach(() => {
      mockClass = new MockClass();
      promise = Utils.getRancherTarget.bind(mockClass)();
    });

    it('should reject promise', async() => {
      await expect(promise).to.be.rejectedWith(EXPECTED_RANCHER_TARGET_REJECT_MESSAGE);
    });
  });

  describe('when there is a namespace', () => {
    describe('when type is not ingress', () => {
      describe('when there is a service', () => {
        beforeEach(() => {
          mockClass = new MockClass(NAMESPACE, SERVICE);
          promise = Utils.getRancherTarget.bind(mockClass)();
        });

        it('should fulfill promise with service target including namespace', async() => {
          await expect(promise).to.be.fulfilled;
          await expect(promise).to.eventually.become(EXPECTED_SERVICE_TARGET);
        });
      });
    });

    describe('when type is ingress', () => {
      describe('when there is a service but no ingress object', () => {
        beforeEach(() => {
          mockClass = new MockClass(NAMESPACE, SERVICE, INGRESS_SERVICE_TYPE);
          promise = Utils.getRancherTarget.bind(mockClass)();
        });

        it('should fulfill the promise with service name', async() => {
          await expect(promise).to.be.fulfilled;
          await expect(promise).to.eventually.become(SERVICE);
        });
      });

      describe('when there is no service but there is an ingress object', () => {
        beforeEach(() => {
          mockClass = new MockClass(NAMESPACE, null, INGRESS_SERVICE_TYPE, INGRESS);
          promise = Utils.getRancherTarget.bind(mockClass)();
        });

        it('should fulfill the promise with ingress name', async() => {
          await expect(promise).to.be.fulfilled;
          await expect(promise).to.eventually.become(INGRESS.name);
        });
      });
    });
  });
});

describe('rancherExecute util', () => {
  beforeEach(() => {
    shellStub = sinon.stub(shell, 'run');
  });

  afterEach(() => {
    shell.run.restore();
  });

  describe('with no main command', () => {
    it('should throw an error', () => {
      expect(() => Utils.rancherExecute(null)).to.throw('a Rancher CLI command is required');
    });
  });

  describe('with a main command', () => {
    beforeEach(() => {
      Utils.rancherExecute('someCommand');
    });

    it('should call shell run with command', () => {
      expect(shellStub).to.have.been.calledWith('rancher', ['someCommand'], null);
    });
  });

  describe('with arguments', () => {
    beforeEach(() => {
      Utils.rancherExecute('someCommand', ['sub', 'arg']);
    });

    it('should call shell run with command', () => {
      expect(shellStub).to.have.been.calledWith('rancher', ['someCommand', 'sub', 'arg'], null);
    });
  });

  describe('with global options', () => {
    describe('when there are no global options', () => {
      describe('when options are null', () => {
        beforeEach(() => {
          Utils.rancherExecute('someCommand', [], null);
        });

        it('should not add any global option to command', () => {
          expect(shellStub).to.have.been.calledWith('rancher', ['someCommand'], null);
        });
      });

      describe('when the array of options is empty', () => {
        beforeEach(() => {
          Utils.rancherExecute('someCommand', [], []);
        });

        it('should not add any global option to command', () => {
          expect(shellStub).to.have.been.calledWith('rancher', ['someCommand'], null);
        });
      });
    });

    describe('when gobal options has elements', () => {
      describe('with no args', () => {
        beforeEach(() => {
          Utils.rancherExecute('someCommand', [], ['global', '--option']);
        });

        it('should append global options before main command', () => {
          expect(shellStub).to.have.been.calledWith('rancher', ['global', '--option', 'someCommand'], null);
        });
      });

      describe('with args', () => {
        beforeEach(() => {
          Utils.rancherExecute('someCommand', ['some', 'arg'], ['global', '--option']);
        });

        it('should append global options before main command and args after main command', () => {
          expect(shellStub).to.have.been.calledWith('rancher', ['global', '--option', 'someCommand', 'some', 'arg'], null);
        });
      });
    });
  });
});

describe('getDefaultFromStringOrJson util', () => {
  const DEFAULT_VALID_VALUE = 'some value';

  describe('when passing invalid data', () => {
    describe('when default value is null', () => {
      it('should return null', () => {
        expect(Utils.getDefaultFromStringOrJson(null, null)).to.equal(null);
        expect(Utils.getDefaultFromStringOrJson('', null)).to.equal(null);
        expect(Utils.getDefaultFromStringOrJson(undefined, null)).to.equal(null);
      });
    });

    describe('when default value is not null', () => {
      expect(Utils.getDefaultFromStringOrJson(null, DEFAULT_VALID_VALUE)).to.equal(DEFAULT_VALID_VALUE);
      expect(Utils.getDefaultFromStringOrJson('', DEFAULT_VALID_VALUE)).to.equal(DEFAULT_VALID_VALUE);
      expect(Utils.getDefaultFromStringOrJson(undefined, DEFAULT_VALID_VALUE)).to.equal(DEFAULT_VALID_VALUE);
    });
  });

  describe('when data is a json object', () => {
    it('should return parsed json object', () => {
      expect(Utils.getDefaultFromStringOrJson(VALID_JSON_OBJECT, DEFAULT_VALID_VALUE)).to.deep.equal(JSON.parse(VALID_JSON_OBJECT));
    });
  });

  describe('when data is a not a valid json', () => {
    it('should return the unmodified data', () => {

      expect(Utils.getDefaultFromStringOrJson('some string', DEFAULT_VALID_VALUE)).to.equal('some string');
    });
  });
});

describe('isJSONObject util', () => {
  describe('when passing a json object', () => {
    it('should return true', () => {
      expect(Utils.isJSONObject(VALID_JSON_OBJECT)).to.equal(true);
    });
  });

  describe('when json has an error', () => {
    it('should return false', () => {
      expect(Utils.isJSONObject(INVALID_JSON_OBJECT)).to.equal(false);
    });
  });

  describe('when passing a string', () => {
    it('should return false', () => {
      expect(Utils.isJSONObject('some')).to.equal(false);
    });
  });

  describe('when passing a number', () => {
    it('should return false', () => {
      expect(Utils.isJSONObject(123)).to.equal(false);
    });
  });

  describe('when passing a boolean', () => {
    it('shouldti return false', () => {
      expect(Utils.isJSONObject(true)).to.equal(false);
    });
  });
});
