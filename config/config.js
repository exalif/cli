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
    ...ingressTemplateReplaceMap,
  },
  checkDeployTypes: ['ingress', 'deployment', 'statefulset'],
  checkReplicas: [
    { type: 'deployment', replicasStatusKey: 'deploymentStatus.availableReplicas' },
    { type: 'statefulset', replicasStatusKey: 'statefulSetStatus.readyReplicas' },
  ],
  ingress: {
    checks: {
      state: 'active',
    },
    maxCheckRetries: 20,
    initialCheckWaitDelay: 15000,
  },
  deployment: {
    checks: {
      state: 'active',
      'deploymentStatus.availableReplicas': 1,
    },
    maxCheckRetries: 20,
    initialCheckWaitDelay: 3000,
  },
  statefulset: {
    checks: {
      state: 'active',
      'statefulSetStatus.readyReplicas': 1,
    },
    maxCheckRetries: 20,
    initialCheckWaitDelay: 3000,
  },
}
