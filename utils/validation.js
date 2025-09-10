const validator = require('validator');

// Telegram ID validation
const isValidTelegramId = (id) => {
  return Number.isInteger(id) && id > 0 && id < 10000000000000; // Reasonable bounds for Telegram IDs
};

// Username validation (Telegram format)
const isValidTelegramUsername = (username) => {
  if (!username) return true; // Username is optional
  return /^[a-zA-Z0-9_]{5,32}$/.test(username);
};

// Name validation
const isValidName = (name) => {
  return typeof name === 'string' && name.length >= 1 && name.length <= 255;
};

// Bet amount validation
const isValidBetAmount = (amount) => {
  return Number.isInteger(amount) && amount >= 1 && amount <= 100;
};

// Participants limit validation
const isValidParticipantsLimit = (limit) => {
  return Number.isInteger(limit) && limit >= 2 && limit <= 1000;
};

// Percentage validation
const isValidPercentage = (percentage) => {
  return Number.isInteger(percentage) && percentage >= 1 && percentage <= 99;
};

// UUID validation
const isValidUUID = (uuid) => {
  return validator.isUUID(uuid, 4);
};

// Language code validation (ISO 639-1)
const isValidLanguageCode = (code) => {
  if (!code) return true; // Language code is optional
  return /^[a-z]{2}(-[A-Z]{2})?$/.test(code);
};

// Sanitize user input
const sanitizeString = (str, maxLength = 255) => {
  if (typeof str !== 'string') return '';
  return str.trim().substring(0, maxLength);
};

// Validate raffle settings
const validateRaffleSettings = (settings) => {
  const errors = [];

  if (!isValidParticipantsLimit(settings.participants_limit)) {
    errors.push('Participants limit must be between 2 and 1000');
  }

  if (!isValidBetAmount(settings.bet_amount)) {
    errors.push('Bet amount must be between 1 and 100 stars');
  }

  if (!isValidPercentage(settings.winner_percentage)) {
    errors.push('Winner percentage must be between 1 and 99');
  }

  if (!isValidPercentage(settings.organizer_percentage)) {
    errors.push('Organizer percentage must be between 1 and 99');
  }

  if (settings.winner_percentage + settings.organizer_percentage !== 100) {
    errors.push('Winner and organizer percentages must sum to 100');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Validate Telegram user object
const validateTelegramUser = (user) => {
  const errors = [];

  if (!user.id || !isValidTelegramId(user.id)) {
    errors.push('Invalid Telegram user ID');
  }

  if (!user.first_name || !isValidName(user.first_name)) {
    errors.push('Invalid first name');
  }

  if (user.last_name && !isValidName(user.last_name)) {
    errors.push('Invalid last name');
  }

  if (user.username && !isValidTelegramUsername(user.username)) {
    errors.push('Invalid username format');
  }

  if (user.language_code && !isValidLanguageCode(user.language_code)) {
    errors.push('Invalid language code');
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitized: {
      id: user.id,
      first_name: sanitizeString(user.first_name, 255),
      last_name: user.last_name ? sanitizeString(user.last_name, 255) : null,
      username: user.username ? sanitizeString(user.username, 32) : null,
      language_code: user.language_code || 'en'
    }
  };
};

// Validate pagination parameters
const validatePagination = (limit, offset) => {
  const parsedLimit = parseInt(limit) || 10;
  const parsedOffset = parseInt(offset) || 0;

  return {
    limit: Math.min(Math.max(parsedLimit, 1), 100), // Between 1 and 100
    offset: Math.max(parsedOffset, 0) // Non-negative
  };
};

// Validate admin credentials
const validateAdminCredentials = (username, password) => {
  const errors = [];

  if (!username || username.length < 3 || username.length > 50) {
    errors.push('Username must be between 3 and 50 characters');
  }

  if (!password || password.length < 6) {
    errors.push('Password must be at least 6 characters long');
  }

  if (username && !/^[a-zA-Z0-9_]+$/.test(username)) {
    errors.push('Username can only contain letters, numbers, and underscores');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Rate limiting validation
const validateRateLimit = (windowMs, maxRequests) => {
  return {
    windowMs: Math.min(Math.max(parseInt(windowMs) || 900000, 60000), 3600000), // 1-60 minutes
    maxRequests: Math.min(Math.max(parseInt(maxRequests) || 100, 10), 1000) // 10-1000 requests
  };
};

// Input sanitization for security
const sanitizeInput = {
  // Remove HTML tags and trim
  text: (input, maxLength = 1000) => {
    if (typeof input !== 'string') return '';
    return input.replace(/<[^>]*>?/gm, '').trim().substring(0, maxLength);
  },

  // Sanitize for database queries (additional protection beyond parameterized queries)
  sql: (input) => {
    if (typeof input !== 'string') return '';
    return input.replace(/['"`;\\]/g, '').trim();
  },

  // Sanitize JSON input
  json: (input) => {
    try {
      if (typeof input === 'string') {
        return JSON.parse(input);
      }
      return input;
    } catch (error) {
      return null;
    }
  }
};

// Common validation patterns
const patterns = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^\+?[\d\s\-\(\)]+$/,
  alphanumeric: /^[a-zA-Z0-9]+$/,
  alphanumericWithSpaces: /^[a-zA-Z0-9\s]+$/,
  hexColor: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
  url: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/
};

module.exports = {
  isValidTelegramId,
  isValidTelegramUsername,
  isValidName,
  isValidBetAmount,
  isValidParticipantsLimit,
  isValidPercentage,
  isValidUUID,
  isValidLanguageCode,
  sanitizeString,
  validateRaffleSettings,
  validateTelegramUser,
  validatePagination,
  validateAdminCredentials,
  validateRateLimit,
  sanitizeInput,
  patterns
};