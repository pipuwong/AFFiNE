import { BadRequestException } from '@nestjs/common';
import {
  Args,
  Field,
  GraphQLISODateTime,
  Mutation,
  ObjectType,
  Query,
  registerEnumType,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { RuntimeConfig, RuntimeConfigType } from '@prisma/client';
import { GraphQLJSON } from 'graphql-scalars';

import { Config, DeploymentType, URLHelper } from '../../fundamentals';
import { Public } from '../auth';
import { ServerFlags } from './config';
import { ServerFeature } from './types';

const ENABLED_FEATURES: Set<ServerFeature> = new Set();
export function ADD_ENABLED_FEATURES(feature: ServerFeature) {
  ENABLED_FEATURES.add(feature);
}

registerEnumType(ServerFeature, {
  name: 'ServerFeature',
});

registerEnumType(DeploymentType, {
  name: 'ServerDeploymentType',
});

@ObjectType()
export class PasswordLimitsType {
  @Field()
  minLength!: number;
  @Field()
  maxLength!: number;
}

@ObjectType()
export class CredentialsRequirementType {
  @Field()
  password!: PasswordLimitsType;
}

@ObjectType()
export class ServerConfigType {
  @Field({
    description:
      'server identical name could be shown as badge on user interface',
  })
  name!: string;

  @Field({ description: 'server version' })
  version!: string;

  @Field({ description: 'server base url' })
  baseUrl!: string;

  @Field(() => DeploymentType, { description: 'server type' })
  type!: DeploymentType;

  /**
   * @deprecated
   */
  @Field({ description: 'server flavor', deprecationReason: 'use `features`' })
  flavor!: string;

  @Field(() => [ServerFeature], { description: 'enabled server features' })
  features!: ServerFeature[];

  @Field({ description: 'enable telemetry' })
  enableTelemetry!: boolean;
}

registerEnumType(RuntimeConfigType, {
  name: 'RuntimeConfigType',
});
@ObjectType()
export class ServerRuntimeConfigType implements Partial<RuntimeConfig> {
  @Field()
  id!: string;

  @Field()
  module!: string;

  @Field()
  key!: string;

  @Field()
  description!: string;

  @Field(() => GraphQLJSON)
  value!: any;

  @Field(() => RuntimeConfigType)
  type!: RuntimeConfigType;

  @Field(() => GraphQLISODateTime)
  updatedAt!: Date;
}

@ObjectType()
export class ServerFlagsType implements ServerFlags {
  @Field()
  earlyAccessControl!: boolean;

  @Field()
  syncClientVersionCheck!: boolean;
}

@Resolver(() => ServerConfigType)
export class ServerConfigResolver {
  constructor(
    private readonly config: Config,
    private readonly url: URLHelper
  ) {}

  @Public()
  @Query(() => ServerConfigType, {
    description: 'server config',
  })
  serverConfig(): ServerConfigType {
    return {
      name: this.config.serverName,
      version: this.config.version,
      baseUrl: this.url.home,
      type: this.config.type,
      // BACKWARD COMPATIBILITY
      // the old flavors contains `selfhosted` but it actually not flavor but deployment type
      // this field should be removed after frontend feature flags implemented
      flavor: this.config.type,
      features: Array.from(ENABLED_FEATURES),
      enableTelemetry: this.config.metrics.telemetry.enabled,
    };
  }

  @ResolveField(() => CredentialsRequirementType, {
    description: 'credentials requirement',
  })
  async credentialsRequirement() {
    const config = await this.config.runtime.fetchAll({
      'auth/password.max': true,
      'auth/password.min': true,
    });

    return {
      password: {
        minLength: config['auth/password.min'],
        maxLength: config['auth/password.max'],
      },
    };
  }

  @ResolveField(() => ServerFlagsType, {
    description: 'server flags',
  })
  async flags(): Promise<ServerFlagsType> {
    const records = await this.config.runtime.list('flags');

    return records.reduce((flags, record) => {
      flags[record.key as keyof ServerFlagsType] = record.value as any;
      return flags;
    }, {} as ServerFlagsType);
  }
}

@Resolver(() => ServerRuntimeConfigType)
export class ServerRuntimeConfigResolver {
  constructor(private readonly config: Config) {}

  @Query(() => [ServerRuntimeConfigType], {
    description: 'get all server runtime configurable settings',
  })
  serverRuntimeConfig(): Promise<ServerRuntimeConfigType[]> {
    // TODO: permission check
    return this.config.runtime.list();
  }

  @Mutation(() => ServerRuntimeConfigType, {
    description: 'update server runtime configurable setting',
  })
  async updateRuntimeConfig(
    @Args('id') id: string,
    @Args({ type: () => GraphQLJSON, name: 'value' }) value: any
  ): Promise<ServerRuntimeConfigType> {
    // TODO: permission check
    // TODO: type check
    try {
      return await this.config.runtime.set(id as any, value);
    } catch (e) {
      throw new BadRequestException('Failed to update runtime config', {
        cause: e,
      });
    }
  }
}
