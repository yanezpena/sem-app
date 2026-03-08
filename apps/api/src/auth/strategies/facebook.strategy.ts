import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-facebook';
import { AuthService } from '../auth.service';

@Injectable()
export class FacebookStrategy extends PassportStrategy(Strategy, 'facebook') {
  constructor(private authService: AuthService) {
    const clientID = process.env.FACEBOOK_APP_ID;
    const clientSecret = process.env.FACEBOOK_APP_SECRET;

    if (!clientID || !clientSecret) {
      console.warn(
        'Facebook OAuth credentials not configured. Facebook login will not work.',
      );
      super({
        clientID: 'dummy',
        clientSecret: 'dummy',
        callbackURL: 'http://localhost:3000/auth/facebook/callback',
      });
      return;
    }

    super({
      clientID,
      clientSecret,
      callbackURL: `${process.env.BASE_URL || 'http://localhost:3000'}/auth/facebook/callback`,
      scope: ['email'],
      profileFields: ['emails', 'name'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    try {
      const { id, emails, name } = profile._json;
      const email = emails?.[0]?.value;
      const displayName = name
        ? `${name.first_name} ${name.last_name}`
        : undefined;

      if (!email) {
        return done(new Error('No email provided by Facebook'), null);
      }

      const user = await this.authService.findOrCreateOAuthUser(
        'facebook',
        id,
        email,
        displayName,
      );

      done(null, user);
    } catch (error) {
      done(error, null);
    }
  }
}
