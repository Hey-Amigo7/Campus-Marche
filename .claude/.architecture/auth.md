# Authentication Rules

Users must verify HTU email before becoming active.

Roles:
- buyer
- seller
- admin

Seller requirements:
- verified email
- completed profile
- accepted seller onboarding

Authentication stack:
- JWT access token
- refresh token rotation
- httpOnly cookies

Required flows:
- signup
- login
- logout
- forgot password
- resend verification
- OTP verification

Security requirements:
- bcrypt hashing
- rate limiting
- brute-force protection

The UI must always reflect actual auth state.