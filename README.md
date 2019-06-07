# Exalif CLI

CLI to do some magic stuff on Rancher and K8s. Originally intended to be used from gitlab CI.

[![Build Status](https://travis-ci.org/exalif/cli.svg?branch=master)](https://travis-ci.org/exalif/cli)
[![Coverage Status](https://coveralls.io/repos/github/exalif/cli/badge.svg)](https://coveralls.io/github/exalif/cli)

## Requirements

 - node 10
 - Rancher CLI >2.0.0
 - kubectl

*Note*: all these dependencies are already embedded when using official `exalif/cli` docker image.

## Usage

### General usage

`docker run --rm -v $(pwd):/data exalif/cli COMMAND [ARGUMENTS]`

### List available commands

You can use `docker run --rm exalif/cli help` to get full set of commands.

### Mandatory options

Some options are required for any command:
  - `--orchestrator-url`: url of your Rancher installation
  - `--orchestrator-access-key`: access key configured in your Rancher installation
  - `--orchestrator-secret-key`: secret key configured in your Rancher installation

## Use environment variables

Every cli options can be provided by environment variables in **uppercase** and prefixed with `EXALIF_`.

Environment variables can be store on proper files (e.g: `~/.bashrc` or `~/.bash_profile`) or provided at docker run level.

Example:

`docker run --rm -e EXALIF_ORCHESTRATOR_ACCESS_KEY=rancherAccessKey ...`

## Override configuration

You can override `config.js` configuration by mounting apprioriate file in docker `/app/config` directory.