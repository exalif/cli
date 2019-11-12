'use strict';

const shell = require('../utils/shell');

module.exports = class Utils {
  /**
  * Access object nested value by giving a path
  *
  * @param obj {Object} The object you want to access value from
  * @param path {string} The value path. e.g: `bar.baz`
  * @example
  *  const obj = { foo: { bar: 'Baz' } };
     const path = 'foo.bar';
     leaf(obj, path) // 'Baz'
  */
  static leaf(obj, path) {
    for (var i=0, path=path.split('.'), len=path.length; i<len; i++){
      obj = obj[path[i]];
    };

    return obj;
  }

  /**
  * Get rancher target name
  *
  * @param this (bind): type, namespace, ingress, service
  * @returns Promise<string>
  */
  static getRancherTarget() {
    const serviceName = this.type === 'ingress' ? this.ingress.name || this.service : this.service;

    return new Promise((resolve, reject) => {
      if (!this.namespace || !serviceName) {
        reject(`You must specify a namespace and a target name`);
      }

      const target = this.type === 'ingress' ? `${serviceName}` : `${this.namespace}:${serviceName}`;

      resolve(target);
    });
  }

  /**
  * Execute command with Rancher CLI
  *
  * @param mainCommand {string} the main command which will be executed. e.g: inspect
  * @param args {string[]} command arguments (will be placed after main command in executed command)
  * @param globalOptions {string[]} command line global options (will be placed first in executed command) main command which will be executed
  * @returns Promise<any>
  */
  static rancherExecute(mainCommand, args = [], globalOptions = [], allowFailurePattern = null) {
    if (!mainCommand) {
      throw new Error('a Rancher CLI command is required');
    }

    let commandArgs = [];

    if (globalOptions && globalOptions.length > 0) {
      commandArgs = commandArgs.concat(globalOptions);
    }

    commandArgs.push(mainCommand);
    commandArgs = commandArgs.concat(args);

    return shell.run('rancher', commandArgs, allowFailurePattern);
  }

  static getDefaultFromStringOrJson(data, defaultValue = null) {
    return !!data
    ? this.isJSONObject(data) ? JSON.parse(data) : data
    : defaultValue;
  }

  static isJSONObject(string) {
    try {
      const json = JSON.parse(string);
      return (typeof json === 'object');
    } catch (e) {
      return false;
    }
  }
}
