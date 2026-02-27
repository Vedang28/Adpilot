'use strict';

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const config = require('../config');
const userRepo = require('../repositories/userRepository');
const teamRepo = require('../repositories/teamRepository');
const { AppError } = require('../middleware/errorHandler');

const SALT_ROUNDS = 12;

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function generateUniqueSlug(base) {
  let slug = slugify(base);
  let existing = await teamRepo.findBySlug(slug);
  let counter = 1;
  while (existing) {
    slug = `${slugify(base)}-${counter}`;
    existing = await teamRepo.findBySlug(slug);
    counter += 1;
  }
  return slug;
}

function generateTokens(user) {
  const payload = {
    userId: user.id,
    teamId: user.teamId,
    role: user.role,
  };

  const accessToken = jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  });

  const refreshToken = jwt.sign(payload, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn,
  });

  return { accessToken, refreshToken };
}

async function register({ name, email, password, teamName }) {
  const existing = await userRepo.findByEmail(email);
  if (existing) {
    throw new AppError('Email already in use', 409);
  }

  const slug = await generateUniqueSlug(teamName);
  const team = await teamRepo.create({ name: teamName, slug });

  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await userRepo.create({
    name,
    email,
    password: hashedPassword,
    teamId: team.id,
    role: 'admin',
  });

  const tokens = generateTokens(user);

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
    team: {
      id: team.id,
      name: team.name,
      slug: team.slug,
      plan: team.plan,
    },
    ...tokens,
  };
}

async function login({ email, password }) {
  const user = await userRepo.findByEmail(email);
  if (!user || !user.isActive) {
    throw new AppError('Invalid email or password', 401);
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    throw new AppError('Invalid email or password', 401);
  }

  const tokens = generateTokens(user);

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      teamId: user.teamId,
    },
    ...tokens,
  };
}

module.exports = { register, login, generateTokens };
