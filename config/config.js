const ingressTemplateReplaceMap = {
  INGRESS_CERT_ISSUER: 'issuer',
  NAMESPACE: 'namespace',
  INGRESS_NAME: 'name',
  INGRESS_HOST: 'host',
  INGRESS_BACKEND_NAME: 'backend',
  INGRESS_BACKEND_PORT: 'port',
  INGRESS_SSL_CERT_SECRET: 'cert',
}

exports.config = {
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
    ingress: {
      checkKeys: ['state'],
      expectedCheckValues: ['active'],
      maxCheckRetries: 20,
      initialCheckWaitDelay: 15000
    },
    deployment: {
      checkKeys: ['state', 'deploymentStatus.availableReplicas'],
      expectedCheckValues: ['active', '1'],
      maxCheckRetries: 20,
      initialCheckWaitDelay: 3000
    }
}
