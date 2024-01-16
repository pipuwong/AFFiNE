import { DynamicModule, FactoryProvider } from '@nestjs/common';
import { merge } from 'lodash-es';

import { ApplyType } from '../utils/types';
import { AFFiNEConfig } from './def';
import { Runtime } from './runtime/service';

/**
 * @example
 *
 * import { Config } from '@affine/server'
 *
 * class TestConfig {
 *   constructor(private readonly config: Config) {}
 *   test() {
 *     return this.config.env
 *   }
 * }
 */
export class Config extends ApplyType<AFFiNEConfig>() {
  runtime!: Runtime;
}

function createConfigProvider(
  override?: DeepPartial<Config>
): FactoryProvider<Config> {
  return {
    provide: Config,
    useFactory: runtime => {
      return Object.freeze(merge({}, globalThis.AFFiNE, override, { runtime }));
    },
    inject: [Runtime],
  };
}

export class ConfigModule {
  static forRoot = (override?: DeepPartial<AFFiNEConfig>): DynamicModule => {
    const provider = createConfigProvider(override);

    return {
      global: true,
      module: ConfigModule,
      providers: [provider, Runtime],
      exports: [provider],
    };
  };
}
