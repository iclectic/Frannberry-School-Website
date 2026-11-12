import { SetMetadata } from '@nestjs/common';

export const ALLOW_DURING_MFA_SETUP_KEY = 'allowDuringMfaSetup';
export const AllowDuringMfaSetup = () => SetMetadata(ALLOW_DURING_MFA_SETUP_KEY, true);
