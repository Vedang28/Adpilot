'use strict';

const { z } = require('zod');

const VALID_ROLES = ['admin', 'manager', 'member'];

const inviteMemberSchema = z.object({
  email: z.string().email('Must be a valid email address'),
  role:  z.enum(VALID_ROLES, {
    errorMap: () => ({ message: `role must be one of: ${VALID_ROLES.join(', ')}` }),
  }),
}).strict();

const acceptInviteSchema = z.object({
  token:    z.string().min(1, 'Invite token is required'),
  name:     z.string().min(1, 'Full name is required').max(255),
  password: z.string().min(8, 'Password must be at least 8 characters'),
}).strict();

const updateMemberRoleSchema = z.object({
  role: z.enum(VALID_ROLES, {
    errorMap: () => ({ message: `role must be one of: ${VALID_ROLES.join(', ')}` }),
  }),
}).strict();

module.exports = { inviteMemberSchema, acceptInviteSchema, updateMemberRoleSchema };
