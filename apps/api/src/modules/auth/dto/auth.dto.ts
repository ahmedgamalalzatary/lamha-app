import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AUTH, normalizeEmail, normalizePhone, OTP, type OtpPurpose } from '@tawsela/shared';
import { Transform } from 'class-transformer';
import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, Length, Matches, MaxLength, MinLength } from 'class-validator';

const toPhone = ({ value }: { value: unknown }) => (typeof value === 'string' ? normalizePhone(value) : value);
const toEmail = ({ value }: { value: unknown }) => (typeof value === 'string' ? normalizeEmail(value) : value);
const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

/** Egyptian mobile, any way it is typed ("+20 155…", "0155…"), stored as "01xxxxxxxxx". */
const PHONE = /^01[0125]\d{8}$/;
const PHONE_MESSAGE = 'phone must be an Egyptian mobile number';

export class PhoneDto {
  @ApiProperty({ example: '01554459196' })
  @Transform(toPhone)
  @IsString()
  @Matches(PHONE, { message: PHONE_MESSAGE })
  phone: string;
}

/** POST /v1/auth/signup/code: step 1, phone and email. */
export class SignupCodeDto extends PhoneDto {
  @ApiProperty({ example: 'ahmed@gmail.com' })
  @Transform(toEmail)
  @IsEmail()
  @MaxLength(255)
  email: string;
}

/** POST /v1/auth/password/code: "نسيت كلمة المرور؟". */
export class PasswordCodeDto extends PhoneDto {}

/** POST /v1/auth/code/verify: the 4 digits. */
export class VerifyCodeDto extends PhoneDto {
  @ApiProperty({ enum: ['signup', 'reset'] })
  @IsIn(['signup', 'reset'])
  purpose: OtpPurpose;

  @ApiProperty({ example: '1234' })
  @IsString()
  @Length(OTP.length, OTP.length)
  @Matches(/^\d+$/)
  code: string;
}

class PasswordDto {
  @ApiProperty({ minLength: AUTH.passwordMinLength })
  @IsString()
  @MinLength(AUTH.passwordMinLength)
  @Matches(/^\S+$/, { message: 'password must not contain spaces' })
  @MaxLength(128)
  password: string;
}

/** POST /v1/auth/signup: step 3, التفاصيل الشخصية. */
export class SignupDto extends PasswordDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  ticket: string;

  @ApiProperty({ maxLength: AUTH.nameMaxLength })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(AUTH.nameMaxLength)
  firstName: string;

  @ApiProperty({ maxLength: AUTH.nameMaxLength })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(AUTH.nameMaxLength)
  lastName: string;

  @ApiPropertyOptional({ example: '3JXDEB' })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() || undefined : value))
  @IsString()
  @MaxLength(12)
  inviteCode?: string;
}

/** POST /v1/auth/password/reset: the new password after the emailed code. */
export class ResetPasswordDto extends PasswordDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  ticket: string;
}

/** POST /v1/auth/login: every role signs in with phone + password. */
export class LoginDto extends PhoneDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  password: string;
}

export class RefreshDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}
