import type {
  CanActivate,
  ExecutionContext,
  OnModuleInit,
} from '@nestjs/common';
import { Injectable, UseGuards } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';

import { getRequestResponseFromContext } from '../../fundamentals';
import { CaptchaService } from './service';

@Injectable()
export class CaptchaGuard implements CanActivate, OnModuleInit {
  private captcha?: CaptchaService;

  constructor(private readonly ref: ModuleRef) {}

  onModuleInit() {
    this.captcha = this.ref.get(CaptchaService, { strict: false });
  }

  async canActivate(context: ExecutionContext) {
    const { req } = getRequestResponseFromContext(context);

    const captcha = this.captcha;
    if (captcha) {
      const { token, challenge } = req.query;
      const credential = captcha.assertValidCredential({ token, challenge });
      await captcha.verifyRequest(credential, req);
    }

    return true;
  }
}

/**
 * This guard is used to protect routes/queries/mutations that require a user to be check browser env.
 * It will check if the user has passed the captcha challenge.
 *
 * @example
 *
 * ```typescript
 * \@Captcha()
 * \@Query(() => UserType)
 * protected() {
 *   return true;
 * }
 * ```
 */
export const Captcha = () => {
  return UseGuards(CaptchaGuard);
};
