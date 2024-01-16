import { defineStartupConfig, ModuleConfig } from '../config';

declare module '../config' {
  interface AppConfig {
    metrics: ModuleConfig<{
      /**
       * Enable metric and tracing collection
       */
      enabled: boolean;
      /**
       * Enable telemetry
       */
      telemetry: {
        enabled: boolean;
        token: string;
      };
    }>;
  }
}

defineStartupConfig('metrics', {
  enabled: false,
  telemetry: {
    enabled: false,
    token: '',
  },
});
