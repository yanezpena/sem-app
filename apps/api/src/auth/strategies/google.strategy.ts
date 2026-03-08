import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { AuthService } from '../auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private authService: AuthService) {
    const clientID = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientID || !clientSecret) {
      console.warn(
        'Google OAuth credentials not configured. Google login will not work.',
      );
      super({
        clientID: 'dummy',
        clientSecret: 'dummy',
        callbackURL: 'http://localhost:3000/auth/google/callback',
      });
      return;
    }

    super({
      clientID,
      clientSecret,
      callbackURL: `${process.env.BASE_URL || 'http://localhost:3000'}/auth/google/callback`,
      scope: ['email', 'profile'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    try {
      const { id, emails, displayName } = profile;
      const email = emails?.[0]?.value;
      const name = displayName;

      if (!email) {
        return done(new Error('No email provided by Google'), null);
      }

      const user = await this.authService.findOrCreateOAuthUser(
        'google',
        id,
        email,
        name,
      );

      done(null, user);
    } catch (error) {
      done(error, null);
    }
  }
}
