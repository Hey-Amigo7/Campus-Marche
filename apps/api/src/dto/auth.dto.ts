import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, Length, Matches, IsMobilePhone } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'student@htu.edu.gh' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Ama Mensah' })
  @IsString()
  @IsNotEmpty()
  @Length(2, 80)
  name!: string;

  @ApiProperty({ minLength: 8, writeOnly: true, example: 'StrongPass123!' })
  @IsString()
  @Length(8, 128)
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).+$/, {
    message: 'password must contain at least one letter and one number',
  })
  password!: string;
}

export class LoginDto {
  @ApiProperty({ example: 'student@htu.edu.gh' })
  @IsEmail()
  email!: string;

  @ApiProperty({ writeOnly: true, example: 'StrongPass123!' })
  @IsString()
  @IsNotEmpty()
  password!: string;
}

export class ValidateTokenDto {
  @ApiProperty({ writeOnly: true })
  @IsString()
  @IsNotEmpty()
  token!: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ example: 'student@htu.edu.gh' })
  @IsEmail()
  email!: string;
}

export class ResetPasswordDto {
  @ApiProperty({ writeOnly: true })
  @IsString()
  @IsNotEmpty()
  token!: string;

  @ApiProperty({ minLength: 8, writeOnly: true, example: 'NewPass456!' })
  @IsString()
  @Length(8, 128)
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).+$/, {
    message: 'password must contain at least one letter and one number',
  })
  password!: string;
}

export class VerifyOtpDto {
  @ApiProperty({ example: '483920', description: '6-digit OTP code' })
  @IsString()
  @Length(6, 6)
  code!: string;
}

export class SendPhoneOtpDto {
  @ApiProperty({ example: '0244123456', description: 'Ghana phone number' })
  @IsString()
  @IsNotEmpty()
  phone!: string;
}
