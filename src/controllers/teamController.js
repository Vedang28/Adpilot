'use strict';

const teamService   = require('../services/team/TeamService');
const inviteService = require('../services/team/InviteService');
const { success, created } = require('../common/response');

exports.getTeam = async (req, res, next) => {
  try {
    const team = await teamService.getTeam(req.user.teamId);
    return success(res, { team });
  } catch (err) { next(err); }
};

exports.updateTeam = async (req, res, next) => {
  try {
    const team = await teamService.updateTeam(req.user.teamId, req.body);
    return success(res, { team });
  } catch (err) { next(err); }
};

exports.getMembers = async (req, res, next) => {
  try {
    const members = await teamService.getMembers(req.user.teamId);
    return success(res, { members });
  } catch (err) { next(err); }
};

exports.updateMemberRole = async (req, res, next) => {
  try {
    const member = await teamService.updateMemberRole(
      req.user.teamId,
      req.params.userId,
      req.body.role,
      req.user.userId
    );
    return success(res, { member });
  } catch (err) { next(err); }
};

exports.removeMember = async (req, res, next) => {
  try {
    await teamService.removeMember(req.user.teamId, req.params.userId, req.user.userId);
    return success(res, { message: 'Member removed' });
  } catch (err) { next(err); }
};

exports.invite = async (req, res, next) => {
  try {
    const { email, role } = req.body;
    const { invite, inviteUrl } = await inviteService.createInvite(req.user.teamId, email, role);
    return created(res, { invite, inviteUrl });
  } catch (err) { next(err); }
};

exports.listInvites = async (req, res, next) => {
  try {
    const invites = await inviteService.listInvites(req.user.teamId);
    return success(res, { invites });
  } catch (err) { next(err); }
};

exports.revokeInvite = async (req, res, next) => {
  try {
    await inviteService.revokeInvite(req.params.inviteId, req.user.teamId);
    return success(res, { message: 'Invite revoked' });
  } catch (err) { next(err); }
};

exports.acceptInvite = async (req, res, next) => {
  try {
    const { token, name, password } = req.body;
    const user = await inviteService.acceptInvite(token, { name, password });
    return created(res, { message: 'Account created. Please login.', email: user.email });
  } catch (err) { next(err); }
};

exports.getPermissions = async (req, res, next) => {
  try {
    return success(res, { permissions: teamService.constructor.getPermissions(req.user.role) });
  } catch (err) { next(err); }
};
