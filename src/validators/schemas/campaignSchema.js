'use strict';

const { z } = require('zod');

const PLATFORMS  = ['meta', 'google', 'both'];
const OBJECTIVES = ['conversions', 'awareness', 'traffic', 'leads', 'sales', 'app_installs'];
const STATUSES   = ['draft', 'active', 'paused', 'completed'];
const BUDGET_TYPES = ['daily', 'lifetime'];

const createCampaignSchema = z.object({
  name:        z.string().min(1, 'Campaign name is required').max(255),
  platform:    z.enum(PLATFORMS, { errorMap: () => ({ message: `platform must be one of: ${PLATFORMS.join(', ')}` }) }),
  objective:   z.enum(OBJECTIVES).optional().default('conversions'),
  budget:      z.coerce.number().min(0).optional().default(0),
  budgetType:  z.enum(BUDGET_TYPES).optional().default('daily'),
  startDate:   z.coerce.date().optional(),
  endDate:     z.coerce.date().optional(),
}).strict();

const updateCampaignSchema = z.object({
  name:       z.string().min(1).max(255).optional(),
  platform:   z.enum(PLATFORMS).optional(),
  objective:  z.enum(OBJECTIVES).optional(),
  status:     z.enum(STATUSES).optional(),
  budget:     z.coerce.number().min(0).optional(),
  budgetType: z.enum(BUDGET_TYPES).optional(),
  startDate:  z.coerce.date().optional().nullable(),
  endDate:    z.coerce.date().optional().nullable(),
}).strict();

module.exports = { createCampaignSchema, updateCampaignSchema };
