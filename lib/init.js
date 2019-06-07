'use strict';

const style = require('ansi-styles');
const figlet = require('figlet');

const config = require('../config/config').config;
const CommandProcessor = require('./commandProcessor');

module.exports = class Init {

  constructor() {
    this.CLIName = config.name;

    // Instanciate all CLI modules
    this.cp = new CommandProcessor();
  }

  displayLogo() {
    const logoText = figlet.textSync(this.CLIName, {
      horizontalLayout: 'full'
    });

    console.log(`[${style.yellow.open}${logoText}[${style.yellow.close}`);
  }

  startApp() {
    this.displayLogo();
    this.cp.parseArgs();
  }
};
