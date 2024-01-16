import { defineStartupConfig, ModuleConfig } from '../../fundamentals/config';

export interface OAuthProviderConfig {
  clientId: string;
  clientSecret: string;
  args?: Record<string, string>;
}

export enum OAuthProviderName {
  Google = 'google',
  GitHub = 'github',
}

export interface OAuthConfig {
  providers: Partial<{ [key in OAuthProviderName]: OAuthProviderConfig }>;
}

declare module '../config' {
  interface PluginsConfig {
    oauth: ModuleConfig<OAuthConfig>;
  }
}

defineStartupConfig('plugins.oauth', {
  providers: {},
});
