'use strict';

const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');
chai.use(require('sinon-chai'));
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
const style = require('ansi-styles');

let proxyquireStrict = require('proxyquire').noCallThru();

let sandbox, RancherUtils, consoleStub, consoleErrorStub, rancherExecuteStub, retryTaskUntilExpectedValueStub, requestPromiseStub, checkNamespaceStub, executeCreateNamespaceStub, writeFileStub;

const UUID = 'someUUID';
const RANCHER_INSTANCE_MOCK = {
  orchestratorUrl: 'someUrl',
  apiUrl: 'someUrl/v3',
  orchestratorAccessKey: 'someAccessKey',
  orchestratorSecretKey: 'someSecretKey',
  projectId: 'someProjectId',
  loginToken: 'someAccessKey:someSecretKey',
  force: false,
}

const RANCHER_INSTANCE_MOCK_DEPLOYMENT = {
  ...RANCHER_INSTANCE_MOCK,
  type: 'deployment'
}

const RANCHER_INSTANCE_MOCK_ASSERT_AGAINST_REPLICAS = {
  ...RANCHER_INSTANCE_MOCK_DEPLOYMENT,
  assertAgainstTemplateReplicas: true,
}

const RANCHER_INSTANCE_MOCK_WITH_REPLICAS = {
  ...RANCHER_INSTANCE_MOCK_ASSERT_AGAINST_REPLICAS,
  replicas: 2,
}

const RANCHER_INSTANCE_MOCK_REPLICAS_TYPE_MATCHING_CONFIG = {
  ...RANCHER_INSTANCE_MOCK_WITH_REPLICAS,
  type: 'statefulset',
}

const RANCHER_INSTANCE_MOCK_NO_REPLICAS = {
  ...RANCHER_INSTANCE_MOCK_REPLICAS_TYPE_MATCHING_CONFIG,
  replicas: null,
}

const RANCHER_INSTANCE_MOCK_INGRESS = {
  ...RANCHER_INSTANCE_MOCK,
  type: 'ingress'
}

const RANCHER_INSTANCE_MOCK_FORCED = {
  ...RANCHER_INSTANCE_MOCK,
  force: true
}

const SERVICE_UPGRADE_PAYLOAD = {
  some: 'payload'
}
const PAYLOAD = {
  some: 'payload'
}
const SERVICE_UPGRADE_PAYLOAD_WITH_SCHEDULING = {
  ...SERVICE_UPGRADE_PAYLOAD,
  scheduling: {
    more: 'schedule'
  }
}
const TARGET_SERVICE_NAME = 'some target service';
const EXPECTED_REQ_PAYLOAD = {
  method: 'GET',
  uri: `${RANCHER_INSTANCE_MOCK.apiUrl}/project/${RANCHER_INSTANCE_MOCK.projectId}/pods?workloadId=deployment:${TARGET_SERVICE_NAME}`,
  auth: {
    'user': RANCHER_INSTANCE_MOCK.orchestratorAccessKey,
    'pass': RANCHER_INSTANCE_MOCK.orchestratorSecretKey
  },
  json: true
};

const CONFIG = {
  ingress: {
    checks: {
      state: 'active',
    },
    maxCheckRetries: 20,
    initialCheckWaitDelay: 15000
  },
  checkReplicas: [
    { type: 'statefulset', replicasStatusKey: 'statefulSetStatus.readyReplicas' },
  ],
  deployment: {
    checks: {
      state: 'active',
      'deploymentStatus.availableReplicas': 1,
    },
    maxCheckRetries: 20,
    initialCheckWaitDelay: 3000
  },
  statefulset: {
    checks: {
      state: 'active',
      'statefulSetStatus.readyReplicas': 1,
    },
    maxCheckRetries: 20,
    initialCheckWaitDelay: 3000
  },
  name: 'Exalif CLI',
  templateDirectory: 'templates',
  templateDestinationDirectory: 'schemas',
};

const EXPECTED_CHANGED_REPLICAS_CHECKS = {
  state: 'active',
  'statefulSetStatus.readyReplicas': 2,
};

const EXPECTED_CONDITION_DEPLOYMENT = `Checking that status of service match: `
  + '\n  state = active'
  + '\n  deploymentStatus.availableReplicas = 1';

const EXPECTED_CONDITION_STATEFULSET = `Checking that status of service match: `
  + '\n  state = active'
  + '\n  statefulSetStatus.readyReplicas = 1';

  const EXPECTED_CONDITION_STATEFULSET_REPLICAS = `Checking that status of service match: `
  + '\n  state = active'
  + '\n  statefulSetStatus.readyReplicas = 2';

const EXPECTED_CONDITION_INGRESS = `Checking that status of service match: `
  + '\n  state = active';

const RESULTS = [{ result: 'result1', service: 'service1' }, { result: 'result2', service: 'service2' }];
const ERRORED_NAMESPACE = 'erroredNamespace';
const ERRORED_NAMESPACE_WITH_CREATE = 'checkFailCreateSuccess';
const ERRORED_NAMESPACE_WITH_CREATE_AND_ERROR = 'checkFailCreateFail';
const ERRORED_NAMESPACE_WITH_CREATE_AND_ERROR_NAME = 'checkFailCreateFailNamed';
const NAMESPACE = 'someNamespace';

const RANCHER_INSTANCE_MOCK_SUCCESS_NAMESPACE = {
  ...RANCHER_INSTANCE_MOCK,
  namespace: NAMESPACE
};

const RANCHER_INSTANCE_MOCK_ERRORED_NAMESPACE = {
  ...RANCHER_INSTANCE_MOCK,
  namespace: ERRORED_NAMESPACE
};

const RANCHER_INSTANCE_MOCK_ERRORED_NAMESPACE_CREATE = {
  ...RANCHER_INSTANCE_MOCK,
  namespace: ERRORED_NAMESPACE_WITH_CREATE,
  createNonExistingNamespace: true
};

const RANCHER_INSTANCE_MOCK_ERRORED_NAMESPACE_CREATE_ERROR = {
  ...RANCHER_INSTANCE_MOCK,
  namespace: ERRORED_NAMESPACE_WITH_CREATE_AND_ERROR,
  createNonExistingNamespace: true
}

const RANCHER_INSTANCE_MOCK_ERRORED_NAMESPACE_CREATE_NAMEDERROR = {
  ...RANCHER_INSTANCE_MOCK,
  namespace: ERRORED_NAMESPACE_WITH_CREATE_AND_ERROR_NAME,
  createNonExistingNamespace: true
}
const ERRORED_CHECK = 'erroredCheck';
const ERRORED_CHECK_NO_NAME = ERRORED_CHECK + 'noName';

const RANCHER_INSTANCE_MOCK_CERT = {
  ...RANCHER_INSTANCE_MOCK_SUCCESS_NAMESPACE,
  certFrom: 'somePlace'
};
const INGRESS_NO_CERT = {
  some: '{ingress}'
}
const RANCHER_INSTANCE_MOCK_INGRESS_CERT = {
  ...RANCHER_INSTANCE_MOCK_CERT,
  ...INGRESS_NO_CERT,
  ingress: {
    ...INGRESS_NO_CERT,
    cert: 'certificateName',
  },
  type: 'ingress',
}
const RANCHER_INSTANCE_MOCK_CERT_INGRESS_NO_CERT = {
  ...RANCHER_INSTANCE_MOCK_CERT,
  ingress: INGRESS_NO_CERT
}
const FAILED_INGRESS_GET_SECRET_INSTANCE = {
  ...RANCHER_INSTANCE_MOCK_INGRESS_CERT,
  ingress: {
    ...RANCHER_INSTANCE_MOCK_INGRESS_CERT.ingress,
    cert: 'shouldFail'
  }
}

const FAILED_INGRESS_WRITE_FILE_INSTANCE = {
  ...RANCHER_INSTANCE_MOCK_INGRESS_CERT,
  ingress: {
    ...RANCHER_INSTANCE_MOCK_INGRESS_CERT.ingress,
    cert: 'writeFileWillFail'
  }
}

const FAILED_INGRESS_CERT_TRANSFER = {
  ...RANCHER_INSTANCE_MOCK_INGRESS_CERT,
  namespace: 'willFailTransfer'
}

describe('RancherUtils class', () => {
  beforeEach(() => {
    sandbox = sinon.createSandbox();

    consoleStub = sandbox.stub(console, 'log');
    writeFileStub = sandbox.stub().callsFake((filePath, content, enc) => {
      if (content === 'writeFileWillFail') {
        throw new Error('writeFileFailed');
      }
    });
    requestPromiseStub = sandbox.stub().resolves('req ok');

    rancherExecuteStub = sandbox.stub().callsFake((command, args) => {
      if (command === 'inspect') {
        return Promise.resolve(JSON.stringify(SERVICE_UPGRADE_PAYLOAD_WITH_SCHEDULING))
      } else if (command === 'namespace') {
        return Promise.resolve(PAYLOAD)
      } else if (command === 'kubectl') {
        if (args[0] === 'get') {
          if (args[2] === 'shouldFail') {
            return Promise.reject('getSecretFail');
          } else if (args[2] === 'writeFileWillFail') {
            return Promise.resolve('writeFileWillFail');
          } else {
            return Promise.resolve('certContent');
          }
        } else if (args[0] === 'apply') {
          if (args[1] === '--namespace=willFailTransfer') {
            return Promise.reject('transferFailed');
          } else {
            return Promise.resolve('transferOk');
          }
        }
      } else {
        return Promise.resolve();
      }
    });

    retryTaskUntilExpectedValueStub = sandbox.stub().callsFake(async (args) => {
      return await args.task();
    });

    RancherUtils = proxyquireStrict('../../lib/rancher/utils', {
      '../../config/config': {
        config: CONFIG
      },
      '../utils/utils': {
        rancherExecute: rancherExecuteStub
      },
      '../utils/retry': {
        retryTaskUntilExpectedValue: retryTaskUntilExpectedValueStub
      },
      'request-promise-native': requestPromiseStub,
      'uuid': {
        v4: sandbox.stub().returns(UUID),
      },
      'fs': {
        writeFileSync: writeFileStub
      }
    });
  });

  afterEach(() => {
    sandbox.restore();
    RancherUtils = require('../../lib/rancher/utils');
  });

  describe('login', () => {
    it('should execute login command', async () => {
      await expect(RancherUtils.login.bind(RANCHER_INSTANCE_MOCK)()).to.eventually.become(true);
      expect(rancherExecuteStub).to.have.been.calledWith(
        'login',
        [
          '--context',
          RANCHER_INSTANCE_MOCK.projectId,
          '-t',
          RANCHER_INSTANCE_MOCK.loginToken,
          RANCHER_INSTANCE_MOCK.orchestratorUrl
        ]
      );
    });
  });

  describe('getServiceUpgradePayload', () => {
    let command;

    beforeEach(() => {
      command = RancherUtils.getServiceUpgradePayload.bind(RANCHER_INSTANCE_MOCK);
    });

    it('should execute getServiceUpgradePayload command', async () => {
      await expect(command(TARGET_SERVICE_NAME)).to.eventually.become(SERVICE_UPGRADE_PAYLOAD);
    });

    describe('when type is not deployment', () => {
      it('should call rancherExecute with proper arguments', async () => {
        await command(TARGET_SERVICE_NAME);

        expect(rancherExecuteStub).to.have.been.calledWith(
          'inspect', [TARGET_SERVICE_NAME]
        );
      });
    });

    describe('when type is deployment', () => {
      beforeEach(() => {
        command = RancherUtils.getServiceUpgradePayload.bind(RANCHER_INSTANCE_MOCK_DEPLOYMENT);
      });

      it('should call rancherExecute with proper arguments', async () => {
        await command(TARGET_SERVICE_NAME);

        expect(rancherExecuteStub).to.have.been.calledWith(
          'inspect', [`deployment:${TARGET_SERVICE_NAME}`]
        );
      });
    });
  });

  describe('inspectPodsInProject', () => {
    it('should execute inspectPodsInProject command', async () => {
      await expect(RancherUtils.inspectPodsInProject.bind(RANCHER_INSTANCE_MOCK)(TARGET_SERVICE_NAME)).to.eventually.become('req ok');
      expect(requestPromiseStub).to.have.been.calledWith(EXPECTED_REQ_PAYLOAD);
    });
  });

  describe('checkStateBeforeUpgrade', () => {
    describe('when state is active', () => {
      describe('when not paused', () => {
        it('should return resolved promise with proper message', async () => {
          await expect(RancherUtils.checkStateBeforeUpgrade.bind(RANCHER_INSTANCE_MOCK)({ state: 'active', paused: false })).to.eventually.become('Service can be upgraded. Forced: false');
        });
      });

      describe('when paused', () => {
        it('should return reject promise with proper message', async () => {
          await expect(RancherUtils.checkStateBeforeUpgrade.bind(RANCHER_INSTANCE_MOCK)({ state: 'active', paused: true })).to.eventually.be.rejectedWith(`We can't upgrade service which is not active and healthy`);
        });
      });
    });

    describe('when not active', () => {
      describe('when force is false', () => {
        it('should return reject promise with proper message', async () => {
          await expect(RancherUtils.checkStateBeforeUpgrade.bind(RANCHER_INSTANCE_MOCK)({ state: 'pending', paused: false })).to.eventually.be.rejectedWith(`We can't upgrade service which is not active and healthy`);
        });
      });

      describe('when force is true', () => {
        it('should return reject promise with proper message', async () => {
          await expect(RancherUtils.checkStateBeforeUpgrade.bind(RANCHER_INSTANCE_MOCK_FORCED)({ state: 'pending', paused: false })).to.eventually.become('Service can be upgraded. Forced: true');
        });
      });
    });

  });

  describe('checkDeployOnCluster', () => {
    let command;

    describe('when type is deployment', () => {
      beforeEach(() => {
        command = RancherUtils.checkDeployOnCluster.bind(RANCHER_INSTANCE_MOCK_DEPLOYMENT);
      });

      it('should execute checkDeployOnCluster command', async () => {
        await command(TARGET_SERVICE_NAME);
        const callArgs = retryTaskUntilExpectedValueStub.getCall(0).args[0];

        expect(consoleStub).to.have.been.calledWith(EXPECTED_CONDITION_DEPLOYMENT)
        expect(rancherExecuteStub).to.have.been.calledWith(
          'inspect',
          [`deployment:${TARGET_SERVICE_NAME}`]
        );

        expect(callArgs.checks).to.deep.equal(CONFIG.deployment.checks);
        expect(callArgs.maxRetries).to.equal(CONFIG.deployment.maxCheckRetries);
        expect(callArgs.initialWaitDelay).to.equal(CONFIG.deployment.initialCheckWaitDelay);
      });
    });

    describe('when type is ingress', () => {
      beforeEach(() => {
        command = RancherUtils.checkDeployOnCluster.bind(RANCHER_INSTANCE_MOCK_INGRESS);
      });

      it('should execute checkDeployOnCluster command', async () => {
        await command(TARGET_SERVICE_NAME);
        const callArgs = retryTaskUntilExpectedValueStub.getCall(0).args[0];

        expect(consoleStub).to.have.been.calledWith(EXPECTED_CONDITION_INGRESS)
        expect(rancherExecuteStub).to.have.been.calledWith(
          'inspect',
          [
            '--type',
            'ingress',
            TARGET_SERVICE_NAME
          ]
        );

        expect(callArgs.checks).to.deep.equal(CONFIG.ingress.checks);
        expect(callArgs.maxRetries).to.equal(CONFIG.ingress.maxCheckRetries);
        expect(callArgs.initialWaitDelay).to.equal(CONFIG.ingress.initialCheckWaitDelay);
      });
    });

    describe('when assert against template replicas option is set to true', () => {
      describe('when there are replicas in service template', () => {
        describe('when config replicas key exists on type check', () => {
          beforeEach(() => {
            command = RancherUtils.checkDeployOnCluster.bind(RANCHER_INSTANCE_MOCK_REPLICAS_TYPE_MATCHING_CONFIG);
          });

          it('should execute checkDeployOnCluster command without replacing replicas checks', async () => {
            await command(TARGET_SERVICE_NAME);
            const callArgs = retryTaskUntilExpectedValueStub.getCall(0).args[0];

            expect(consoleStub).to.have.been.calledWith(EXPECTED_CONDITION_STATEFULSET_REPLICAS)
            expect(rancherExecuteStub).to.have.been.calledWith(
              'inspect',
              [`statefulset:${TARGET_SERVICE_NAME}`]
            );

            expect(callArgs.checks).to.deep.equal(EXPECTED_CHANGED_REPLICAS_CHECKS);
            expect(callArgs.maxRetries).to.equal(CONFIG.statefulset.maxCheckRetries);
            expect(callArgs.initialWaitDelay).to.equal(CONFIG.statefulset.initialCheckWaitDelay);
          });
        });

        describe('when config replicas key is not found', () => {
          beforeEach(() => {
            command = RancherUtils.checkDeployOnCluster.bind(RANCHER_INSTANCE_MOCK_WITH_REPLICAS);
          });

          it('should execute checkDeployOnCluster command', async () => {
            await command(TARGET_SERVICE_NAME);
            const callArgs = retryTaskUntilExpectedValueStub.getCall(0).args[0];

            expect(consoleStub).to.have.been.calledWith(EXPECTED_CONDITION_DEPLOYMENT)
            expect(rancherExecuteStub).to.have.been.calledWith(
              'inspect',
              [`deployment:${TARGET_SERVICE_NAME}`]
            );

            expect(callArgs.checks).to.deep.equal(CONFIG.deployment.checks);
            expect(callArgs.maxRetries).to.equal(CONFIG.deployment.maxCheckRetries);
            expect(callArgs.initialWaitDelay).to.equal(CONFIG.deployment.initialCheckWaitDelay);
          });
        });
      });

      describe('when there are no replicas in service template', () => {
        beforeEach(() => {
          command = RancherUtils.checkDeployOnCluster.bind(RANCHER_INSTANCE_MOCK_NO_REPLICAS);
        });

        it('should execute checkDeployOnCluster command without replacing replicas checks', async () => {
          await command(TARGET_SERVICE_NAME);
          const callArgs = retryTaskUntilExpectedValueStub.getCall(0).args[0];

          expect(consoleStub).to.have.been.calledWith(EXPECTED_CONDITION_STATEFULSET)
          expect(rancherExecuteStub).to.have.been.calledWith(
            'inspect',
            [`statefulset:${TARGET_SERVICE_NAME}`]
          );

          expect(callArgs.checks).to.deep.equal(CONFIG.statefulset.checks);
          expect(callArgs.maxRetries).to.equal(CONFIG.statefulset.maxCheckRetries);
          expect(callArgs.initialWaitDelay).to.equal(CONFIG.statefulset.initialCheckWaitDelay);
        });
      });
    });
  });

  describe('displayStackResult', () => {
    describe('when results is empty', () => {
      it('should do nothing', () => {
        RancherUtils.displayStackResult([]);
        RancherUtils.displayStackResult();

        expect(consoleStub).not.to.have.been.called;
      });
    });

    describe('when there are results', () => {
      it('should print result line for each result', () => {
        RancherUtils.displayStackResult(RESULTS);

        expect(consoleStub).to.have.callCount(RESULTS.length);

        RESULTS.forEach((result, index) => {
          expect( consoleStub.getCall(index).args[0]).to.equal(`  ${style.cyan.open}${result.service}${style.cyan.close} - ${style.green.open}${result.result}${style.green.close}`);
        });
      });
    });
  });

  describe('createNamespace', () => {
    beforeEach(() => {
      checkNamespaceStub = sandbox.stub(RancherUtils, 'checkNamespace').callsFake((namespace) => {
        if (namespace === ERRORED_NAMESPACE || namespace === ERRORED_NAMESPACE_WITH_CREATE
          || namespace === ERRORED_NAMESPACE_WITH_CREATE_AND_ERROR || namespace === ERRORED_NAMESPACE_WITH_CREATE_AND_ERROR_NAME) {
          return Promise.reject(ERRORED_CHECK);
        } else {
          return Promise.resolve('checked');
        }
      });

      executeCreateNamespaceStub = sandbox.stub(RancherUtils, 'executeCreateNamespace').callsFake((namespace) => {
        if (namespace === ERRORED_NAMESPACE_WITH_CREATE_AND_ERROR) {
          return Promise.reject(ERRORED_CHECK_NO_NAME);
        } else if (namespace === ERRORED_NAMESPACE_WITH_CREATE_AND_ERROR_NAME) {
          return Promise.reject({ name: ERRORED_CHECK });
        } else {
          return Promise.resolve('created');
        }
      });

      consoleErrorStub = sandbox.stub(console, 'error')
    });

    describe('when namespace exists', () => {
      it('should resolve with result', async () => {
        await expect(RancherUtils.createNamespace.bind(RANCHER_INSTANCE_MOCK_SUCCESS_NAMESPACE)()).to.eventually.become('checked');
      });
    });

    describe('when namespace does not exist', () => {
      describe('when createNonExistingNamespace is false', () => {
        it('should reject with error', async () => {
          await expect(RancherUtils.createNamespace.bind(RANCHER_INSTANCE_MOCK_ERRORED_NAMESPACE)()).to.eventually.be.rejectedWith(ERRORED_CHECK);
          expect(consoleErrorStub).to.have.been.calledWith(ERRORED_CHECK)
        });
      });

      describe('when createNonExistingNamespace is true', () => {
        describe('when namespace created successfully', () => {
          it('should resolve', async () => {
            await expect(RancherUtils.createNamespace.bind(RANCHER_INSTANCE_MOCK_ERRORED_NAMESPACE_CREATE)()).to.eventually.become('created');
          });
        });

        describe('when namespace creation fails', () => {
          describe('with named error', () => {
            it('should reject with named error', async () => {
              await expect(RancherUtils.createNamespace.bind(RANCHER_INSTANCE_MOCK_ERRORED_NAMESPACE_CREATE_NAMEDERROR)()).to.eventually.be.rejectedWith('erroredCheck');
              expect(consoleErrorStub).to.have.been.calledWith({ name: ERRORED_CHECK });
            });
          });

          describe('with other error', () => {
            it('should reject with error', async () => {
              await expect(RancherUtils.createNamespace.bind(RANCHER_INSTANCE_MOCK_ERRORED_NAMESPACE_CREATE_ERROR)()).to.eventually.be.rejectedWith(ERRORED_CHECK_NO_NAME);
              expect(consoleErrorStub).to.have.been.calledWith(ERRORED_CHECK_NO_NAME);
            });
          });
        });
      });
    });
  });

  describe('checkNamespace', () => {
    let command;

    beforeEach(() => {
      command = RancherUtils.checkNamespace.bind(RANCHER_INSTANCE_MOCK_SUCCESS_NAMESPACE);
    });

    it('should execute getServiceUpgradePayload command', async () => {
      await expect(command(NAMESPACE)).to.eventually.become(JSON.stringify(SERVICE_UPGRADE_PAYLOAD_WITH_SCHEDULING));
    });


    it('should call rancherExecute with proper arguments', async () => {
      await command(NAMESPACE);

      expect(consoleStub).to.have.callCount(1);
      expect(consoleStub).to.have.been.calledWith(`Executing inspect --type namespace ${NAMESPACE}`);
      expect(rancherExecuteStub).to.have.been.calledWith(
        'inspect', [
          `--type`,
          'namespace',
          NAMESPACE
        ]
      );
    });
  });

  describe('executeCreateNamespace', () => {
    let command;

    beforeEach(() => {
      command = RancherUtils.executeCreateNamespace.bind(RANCHER_INSTANCE_MOCK_SUCCESS_NAMESPACE);
    });

    it('should execute getServiceUpgradePayload command', async () => {
      await expect(command(NAMESPACE)).to.eventually.become(PAYLOAD);
    });


    it('should call rancherExecute with proper arguments', async () => {
      await command(NAMESPACE);

      expect(consoleStub).to.have.callCount(1);
      expect(consoleStub).to.have.been.calledWith(`Executing namespace create ${NAMESPACE}`);
      expect(rancherExecuteStub).to.have.been.calledWith(
        'namespace', [
          `create`,
          NAMESPACE
        ]
      );
    });
  });

  describe('copyCertificate', () => {
    let command;

    describe('when certForm is not defined', () => {
      beforeEach(() => {
        command = RancherUtils.copyCertificate.bind(RANCHER_INSTANCE_MOCK_SUCCESS_NAMESPACE);
      });

      it('should execute resolve with no need message', async () => {
        await expect(command()).to.eventually.become('no need');
      });
    });

    describe('when certFrom is defined', () => {
      describe('when ingress is not defined', () => {
        beforeEach(() => {
          command = RancherUtils.copyCertificate.bind(RANCHER_INSTANCE_MOCK_CERT);
        });

        it('should reject with error', async () => {
          await expect(command()).to.eventually.be.rejectedWith('Cert should be provided in ingress object for cert copy to be executed');
        });
      });

      describe('when ingress is defined', () => {
        describe('when ingress doesn\'t contain cert', () => {
          beforeEach(() => {
            command = RancherUtils.copyCertificate.bind(RANCHER_INSTANCE_MOCK_CERT_INGRESS_NO_CERT);
          });

          it('should reject with error', async () => {
            await expect(command()).to.eventually.be.rejectedWith('Cert should be provided in ingress object for cert copy to be executed');
          });
        });

        describe('when there are certs', () => {
          describe('when execution is a success', () => {
            beforeEach(() => {
              command = RancherUtils.copyCertificate.bind(RANCHER_INSTANCE_MOCK_INGRESS_CERT);
            });

            it('should log execution', async () => {
              await command();

              expect(consoleStub).to.have.been.calledWith(`Executing kubectl get secret ${RANCHER_INSTANCE_MOCK_INGRESS_CERT.ingress.cert} --namespace=${RANCHER_INSTANCE_MOCK_INGRESS_CERT.certFrom} --export -o yaml`);
            });

            it('should create cert template file', async () => {
              await command();

              expect(writeFileStub).to.have.been.calledWith(`schemas/cert.yaml`, `certContent`, `utf8`);
            });

            it('should execute commands on cluster', async () => {
              await command();

              expect(rancherExecuteStub).to.have.callCount(2);
              expect(rancherExecuteStub.getCall(0).args).to.deep.equal([
                'kubectl',
                [
                  'get',
                  'secret',
                  RANCHER_INSTANCE_MOCK_INGRESS_CERT.ingress.cert,
                  `--namespace=${RANCHER_INSTANCE_MOCK_INGRESS_CERT.certFrom}`,
                  '--export',
                  '-o',
                  'yaml'
                ]
              ]);
              expect(rancherExecuteStub.getCall(1).args).to.deep.equal([
                'kubectl',
                [
                  'apply',
                  `--namespace=${RANCHER_INSTANCE_MOCK_INGRESS_CERT.namespace}`,
                  '-f',
                  `${CONFIG.templateDestinationDirectory}/cert.yaml`
                ]
              ]);
            });

            it('should return transfer cert result', async () => {
              await expect(command()).to.eventually.become('transferOk');
            });
          });

          describe('when execution fails', () => {
            describe('when get cert command exec fails', () => {
              beforeEach(() => {
                command = RancherUtils.copyCertificate.bind(FAILED_INGRESS_GET_SECRET_INSTANCE);
              });

              it('should reject with error', async () => {
                await expect(command()).to.eventually.be.rejectedWith('getSecretFail');
              });
            });

            describe('when write cert template fails', () => {
              beforeEach(() => {
                command = RancherUtils.copyCertificate.bind(FAILED_INGRESS_WRITE_FILE_INSTANCE);
              });

              it('should reject with error', async () => {
                await expect(command()).to.eventually.be.rejectedWith('writeFileFailed');
              });
            });

            describe('when write cert template fails', () => {
              beforeEach(() => {
                command = RancherUtils.copyCertificate.bind(FAILED_INGRESS_CERT_TRANSFER);
              });

              it('should reject with error', async () => {
                await expect(command()).to.eventually.be.rejectedWith('transferFailed');
              });
            });
          });
        });
      });
    });
  });
});
