import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { User } from '@prisma/client';
import * as crypto from 'crypto';
import axios from 'axios';

type UserWithoutPassword = Omit<User, 'hashedPassword'>;

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, key] = stored.split(':');
  if (!salt || !key) return false;
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  try {
    return crypto.timingSafeEqual(
      Buffer.from(key, 'hex'),
      Buffer.from(derived, 'hex'),
    );
  } catch {
    return false;
  }
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  signToken(user: UserWithoutPassword): string {
    return this.jwtService.sign({
      sub: user.id,
      email: user.email,
    });
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private async createAndStoreRefreshToken(userId: string): Promise<string> {
    const raw = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(raw);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await this.prisma.refreshToken.create({
      data: { userId, tokenHash, expiresAt },
    });
    return raw;
  }

  async refresh(refreshToken: string): Promise<{
    user: UserWithoutPassword;
    accessToken: string;
    refreshToken: string;
  }> {
    const tokenHash = this.hashToken(refreshToken);
    const stored = await this.prisma.refreshToken.findFirst({
      where: { tokenHash },
      include: { user: true },
    });
    if (!stored || stored.expiresAt < new Date()) {
      if (stored) await this.prisma.refreshToken.delete({ where: { id: stored.id } });
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
    await this.prisma.refreshToken.delete({ where: { id: stored.id } });
    const { hashedPassword, ...user } = stored.user as User & { hashedPassword?: string };
    const newRefreshToken = await this.createAndStoreRefreshToken(user.id);
    return {
      user,
      accessToken: this.signToken(user),
      refreshToken: newRefreshToken,
    };
  }

  async register(dto: RegisterDto): Promise<{
    user: UserWithoutPassword;
    accessToken: string;
    refreshToken: string;
  }> {
    // make a helper type that includes the password field because the generated
    // client may not yet reflect our schema change until `prisma generate` is run
    type UserWithPassword = User & { hashedPassword: string };

    // check for existing email
    const existing = (await this.prisma.user.findUnique({
      where: { email: dto.email },
    })) as UserWithPassword | null;
    if (existing) {
      throw new ConflictException('Email already registered');
    }
    const hashed = hashPassword(dto.password);
    const user = (await this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name,
        // cast to any so TypeScript doesn't complain if the generated type
        // doesn't yet include `hashedPassword` (will be corrected after
        // running `prisma generate`).
        hashedPassword: hashed,
      } as any,
    })) as UserWithPassword;
    // remove password before returning
    const { hashedPassword, ...result } = user;
    const refreshToken = await this.createAndStoreRefreshToken(result.id);
    return { user: result, accessToken: this.signToken(result), refreshToken };
  }

  async login(dto: LoginDto): Promise<{
    user: UserWithoutPassword;
    accessToken: string;
    refreshToken: string;
  }> {
    type UserWithPassword = User & { hashedPassword: string };

    const user = (await this.prisma.user.findUnique({
      where: { email: dto.email },
    })) as UserWithPassword | null;
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    if (!verifyPassword(dto.password, user.hashedPassword)) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const { hashedPassword, ...result } = user;
    const refreshToken = await this.createAndStoreRefreshToken(result.id);
    return { user: result, accessToken: this.signToken(result), refreshToken };
  }

  async findOrCreateOAuthUser(
    provider: string,
    providerId: string,
    email: string,
    name?: string,
  ): Promise<User> {
    // Try to find existing user by provider and providerId
    let user = await this.prisma.user.findFirst({
      where: {
        provider,
        providerId,
      },
    });

    if (!user) {
      // Check if email already exists with different provider
      const existingEmailUser = await this.prisma.user.findUnique({
        where: { email },
      });

      if (existingEmailUser) {
        throw new ConflictException(
          `Email already registered with ${existingEmailUser.provider || 'email'}`,
        );
      }

      // Create new OAuth user
      user = await this.prisma.user.create({
        data: {
          email,
          name,
          provider,
          providerId,
        },
      });
    }

    return user;
  }

  async validateOAuthUser(
    provider: string,
    providerId: string,
  ): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: {
        provider,
        providerId,
      },
    });
  }

  async verifyGoogleToken(accessToken: string): Promise<User> {
    try {
      // Verify the token with Google
      const response = await axios.get(
        `https://www.googleapis.com/oauth2/v2/userinfo?access_token=${accessToken}`,
      );

      const { id, email, name } = response.data;

      if (!email) {
        throw new UnauthorizedException('No email provided by Google');
      }

      return this.findOrCreateOAuthUser('google', id, email, name);
    } catch (error) {
      throw new UnauthorizedException('Invalid Google token');
    }
  }

  /** Build auth response for OAuth users (User may have null hashedPassword) */
  async authResponse(user: User): Promise<{
    user: UserWithoutPassword;
    accessToken: string;
    refreshToken: string;
  }> {
    const { hashedPassword, ...safe } = user as User & { hashedPassword?: string };
    const refreshToken = await this.createAndStoreRefreshToken(safe.id);
    return { user: safe, accessToken: this.signToken(safe), refreshToken };
  }

  async verifyFacebookToken(accessToken: string): Promise<User> {
    try {
      // Verify the token with Facebook
      const response = await axios.get(
        `https://graph.facebook.com/me?fields=id,email,name&access_token=${accessToken}`,
      );

      const { id, email, name } = response.data;

      if (!email) {
        throw new UnauthorizedException('No email provided by Facebook');
      }

      return this.findOrCreateOAuthUser('facebook', id, email, name);
    } catch (error) {
      throw new UnauthorizedException('Invalid Facebook token');
    }
  }
}
