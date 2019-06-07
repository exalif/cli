'use strict';

const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');
chai.use(require('sinon-chai'));
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
const figlet = require('figlet');

const Init = require('../lib/init');
const config = require('../config/config').config;

const CommandProcessor = require('../lib/commandProcessor');
let init, commandProcessorStub, figletStub;

describe('init', () => {
  describe('constructor', () => {
    beforeEach(() => {

      init = new Init();
    });

    it('should create a Init class', () => {
      expect(init).to.be.instanceOf(Init);
    });

    it('should add a CLI name', () => {
      expect(init.CLIName).to.equal(config.name);
    });

    it('should create a command processor instance', () => {
      expect(init.cp).to.be.instanceOf(CommandProcessor);
    });
  });

  describe('start App', () => {
    beforeEach(() => {
      commandProcessorStub = sinon.stub(CommandProcessor.prototype, 'parseArgs');
      sinon.spy(console, 'log');
      figletStub = sinon.stub(figlet, 'textSync').callsFake(() => config.name);

      init = new Init();
      init.startApp();
    });

    afterEach(() => {
      CommandProcessor.prototype.parseArgs.restore();
      console.log.restore();
      figlet.textSync.restore();
    });

    it('should call command processor parseArgs method', () => {
      expect(init.cp.parseArgs).to.have.been.called;
    });

    it('should contain CLI name', () => {
      expect(console.log.getCall(0).args[0]).to.contain(config.name);
    });
  });
});
