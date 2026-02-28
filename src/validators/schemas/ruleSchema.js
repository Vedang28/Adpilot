'use strict';

const { z } = require('zod');

const TRIGGER_TYPES = [
  'cpa_exceeds',
  'roas_below',
  'ctr_below',
  'frequency_high',
  'budget_pacing_anomaly',
];

const ACTIONS = [
  'pause_campaign',
  'reduce_budget_10',
  'reduce_budget_20',
  'increase_budget_10',
  'send_alert',
];

const createRuleSchema = z.object({
  campaignId:   z.string().uuid('campaignId must be a valid UUID').optional(),
  triggerType:  z.enum(TRIGGER_TYPES, {
    errorMap: () => ({ message: `triggerType must be one of: ${TRIGGER_TYPES.join(', ')}` }),
  }),
  triggerValue: z.coerce.number().positive('triggerValue must be a positive number'),
  action:       z.enum(ACTIONS, {
    errorMap: () => ({ message: `action must be one of: ${ACTIONS.join(', ')}` }),
  }),
  actionValue:  z.coerce.number().optional(),
}).strict();

const updateRuleSchema = z.object({
  triggerType:  z.enum(TRIGGER_TYPES).optional(),
  triggerValue: z.coerce.number().positive().optional(),
  action:       z.enum(ACTIONS).optional(),
  actionValue:  z.coerce.number().optional().nullable(),
  isActive:     z.boolean().optional(),
}).strict();

module.exports = { createRuleSchema, updateRuleSchema };
