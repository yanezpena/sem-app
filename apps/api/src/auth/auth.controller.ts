import {
  Controller,
  Post,
  Get,
  UseGuards,
  Req,
  Body,
  Query,
  Res,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import type { Response } from 'express';
import axios from 'axios';
import * as crypto from 'crypto';

// In-memory stores for mobile OAuth state and one-time tokens.
// For production, consider moving these to a shared cache like Redis.
const googleMobileStateStore = new Map<string, string>(); // state -> redirect_uri
const googleMobileTokenStore = new Map<string, any>(); // one-time token -> user payload

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('refresh')
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  // Web OAuth flows
  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth() {
    // This route will redirect to Google
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@Req() req) {
    return req.user;
  }

  // Mobile Google OAuth (backend-driven flow)
  @Get('google/mobile/init')
  async googleMobileInit(
    @Query('redirect_uri') redirectUri: string,
    @Res() res: Response,
  ) {
    if (!redirectUri) {
      throw new BadRequestException('Missing redirect_uri');
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

    if (!clientId) {
      throw new BadRequestException('Google OAuth is not configured');
    }

    const state = crypto.randomBytes(16).toString('hex');
    googleMobileStateStore.set(state, redirectUri);

    const callbackUrl = `${baseUrl}/auth/google/mobile/callback`;

    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', callbackUrl);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', 'openid email profile');
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('access_type', 'offline');

    return res.redirect(authUrl.toString());
  }

  @Get('google/mobile/callback')
  async googleMobileCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    if (!code || !state) {
      throw new BadRequestException('Missing code or state');
    }

    const redirectUri = googleMobileStateStore.get(state);
    googleMobileStateStore.delete(state);

    if (!redirectUri) {
      throw new BadRequestException('Invalid or expired state');
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

    if (!clientId || !clientSecret) {
      throw new BadRequestException('Google OAuth is not configured');
    }

    try {
      const tokenResponse = await axios.post(
        'https://oauth2.googleapis.com/token',
        new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          code,
          redirect_uri: `${baseUrl}/auth/google/mobile/callback`,
          grant_type: 'authorization_code',
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );

      const accessToken = tokenResponse.data.access_token;

      if (!accessToken) {
        throw new BadRequestException('No access token returned by Google');
      }

      const user = await this.authService.verifyGoogleToken(accessToken);

      const oneTimeToken = crypto.randomBytes(32).toString('hex');
      googleMobileTokenStore.set(oneTimeToken, user);

      const appRedirectUrl = new URL(redirectUri);
      appRedirectUrl.searchParams.set('token', oneTimeToken);

      return res.redirect(appRedirectUrl.toString());
    } catch (error) {
      return res
        .status(500)
        .send('Failed to complete Google mobile authentication');
    }
  }

  @Post('google/web')
  async googleWebAuth(@Body() body: { code: string; redirectUri: string }) {
    const { code, redirectUri } = body;

    if (!code || !redirectUri) {
      throw new BadRequestException('Missing code or redirectUri');
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new BadRequestException('Google OAuth is not configured');
    }

    try {
      const tokenResponse = await axios.post(
        'https://oauth2.googleapis.com/token',
        new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          code,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );

      const accessToken = tokenResponse.data.access_token;

      if (!accessToken) {
        throw new BadRequestException('No access token returned by Google');
      }

      const user = await this.authService.verifyGoogleToken(accessToken);
      return this.authService.authResponse(user);
    } catch (error: any) {
      // Surface Google's error details during development to make debugging easier.
      if (axios.isAxiosError(error)) {
        // eslint-disable-next-line no-console
        console.error(
          'Google token exchange error:',
          error.response?.data || error.message,
        );
      }
      throw new BadRequestException(
        'Failed to complete Google web authentication',
      );
    }
  }

  @Get('facebook')
  @UseGuards(AuthGuard('facebook'))
  async facebookAuth() {
    // This route will redirect to Facebook
  }

  @Get('facebook/callback')
  @UseGuards(AuthGuard('facebook'))
  async facebookAuthRedirect(@Req() req) {
    return req.user;
  }

  // Old mobile endpoints (kept for backwards compatibility)
  @Post('google/mobile')
  async googleMobileAuth(@Body() body: { accessToken: string }) {
    const user = await this.authService.verifyGoogleToken(body.accessToken);
    return this.authService.authResponse(user);
  }

  @Post('google/mobile/exchange')
  async googleMobileExchange(@Body() body: { token: string }) {
    const user = googleMobileTokenStore.get(body.token);

    if (!user) {
      throw new BadRequestException('Invalid or expired token');
    }

    googleMobileTokenStore.delete(body.token);
    return this.authService.authResponse(user);
  }

  @Post('facebook/mobile')
  async facebookMobileAuth(@Body() body: { accessToken: string }) {
    const user = await this.authService.verifyFacebookToken(body.accessToken);
    return this.authService.authResponse(user);
  }
}
