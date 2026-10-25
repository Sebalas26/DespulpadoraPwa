/**
 * Environment configuration contract for the Despulpadora PWA application.
 */
export interface EnvironmentConfig {
  production: boolean;
  version: string;
  apiUrl: string;
  storagePrefix: string;
}

/**
 * Default environment configuration pointing to the published development backend API.
 */
export const environment: EnvironmentConfig = {
  production: false,
  version: '1.0.0',
  apiUrl: 'https://apidevdespulpadora.parking-flow.com/api',
  storagePrefix: 'despulpadora_'
};
