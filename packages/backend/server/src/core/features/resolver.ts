import { BadRequestException, ForbiddenException } from '@nestjs/common';
import {
  Args,
  Context,
  Int,
  Mutation,
  Query,
  registerEnumType,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';

import { CurrentUser } from '../auth/current-user';
import { sessionUser } from '../auth/service';
import {
  EarlyAccessType,
  FeatureManagementService,
  FeatureType,
} from '../features';
import { UserService } from '../user/service';
import { UserType } from '../user/types';

registerEnumType(EarlyAccessType, {
  name: 'EarlyAccessType',
});

@Resolver(() => UserType)
export class FeatureManagementResolver {
  constructor(
    private readonly users: UserService,
    private readonly feature: FeatureManagementService
  ) {}

  @ResolveField(() => [FeatureType], {
    name: 'features',
    description: 'Enabled features of a user',
  })
  async userFeatures(@CurrentUser() user: CurrentUser) {
    return this.feature.getActivatedUserFeatures(user.id);
  }

  @Mutation(() => Int)
  async addToEarlyAccess(
    @CurrentUser() currentUser: CurrentUser,
    @Args('email') email: string,
    @Args({ name: 'type', type: () => EarlyAccessType }) type: EarlyAccessType
  ): Promise<number> {
    if (!this.feature.isStaff(currentUser.email)) {
      throw new ForbiddenException('You are not allowed to do this');
    }
    const user = await this.users.findUserByEmail(email);
    if (user) {
      return this.feature.addEarlyAccess(user.id, type);
    } else {
      const user = await this.users.createAnonymousUser(email, {
        registered: false,
      });
      return this.feature.addEarlyAccess(user.id, type);
    }
  }

  @Mutation(() => Int)
  async removeEarlyAccess(
    @CurrentUser() currentUser: CurrentUser,
    @Args('email') email: string
  ): Promise<number> {
    if (!this.feature.isStaff(currentUser.email)) {
      throw new ForbiddenException('You are not allowed to do this');
    }
    const user = await this.users.findUserByEmail(email);
    if (!user) {
      throw new BadRequestException(`User ${email} not found`);
    }
    return this.feature.removeEarlyAccess(user.id);
  }

  @Query(() => [UserType])
  async earlyAccessUsers(
    @Context() ctx: { isAdminQuery: boolean },
    @CurrentUser() user: CurrentUser
  ): Promise<UserType[]> {
    if (!this.feature.isStaff(user.email)) {
      throw new ForbiddenException('You are not allowed to do this');
    }
    // allow query other user's subscription
    ctx.isAdminQuery = true;
    return this.feature.listEarlyAccess().then(users => {
      return users.map(sessionUser);
    });
  }
}
