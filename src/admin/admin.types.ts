import type { AdminRole } from '@prisma/client';
import type { Request } from 'express';

export type AdminPrincipal = {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
};

export type AdminRequest = Request & {
  requestId?: string;
  admin?: AdminPrincipal;
};
