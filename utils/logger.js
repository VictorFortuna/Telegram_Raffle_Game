const fs = require('fs');
const path = require('path');

class Logger {
  constructor() {
    this.logLevels = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3
    };
    
    this.currentLevel = this.logLevels[process.env.LOG_LEVEL] || this.logLevels.info;
    this.logDir = path.join(__dirname, '..', 'logs');
    this.ensureLogDirectory();
    
    // Initialize log streams
    this.logStreams = {
      error: this.createLogStream('error.log'),
      combined: this.createLogStream('combined.log'),
      access: this.createLogStream('access.log'),
      security: this.createLogStream('security.log'),
      performance: this.createLogStream('performance.log')
    };

    // Rotate logs daily
    this.setupLogRotation();
  }

  ensureLogDirectory() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  createLogStream(filename) {
    const logPath = path.join(this.logDir, filename);
    return fs.createWriteStream(logPath, { flags: 'a', encoding: 'utf8' });
  }

  setupLogRotation() {
    // Rotate logs at midnight
    const now = new Date();
    const midnight = new Date();
    midnight.setHours(24, 0, 0, 0);
    
    const timeUntilMidnight = midnight.getTime() - now.getTime();
    
    setTimeout(() => {
      this.rotateLogs();
      // Set up daily rotation
      setInterval(() => this.rotateLogs(), 24 * 60 * 60 * 1000);
    }, timeUntilMidnight);
  }

  rotateLogs() {
    try {
      const timestamp = new Date().toISOString().split('T')[0];
      
      Object.entries(this.logStreams).forEach(([type, stream]) => {
        stream.end();
        
        const currentPath = path.join(this.logDir, `${type}.log`);
        const archivePath = path.join(this.logDir, `${type}-${timestamp}.log`);
        
        if (fs.existsSync(currentPath)) {
          fs.renameSync(currentPath, archivePath);
        }
        
        // Recreate the stream
        this.logStreams[type] = this.createLogStream(`${type}.log`);
      });

      // Clean up old logs (keep last 30 days)
      this.cleanOldLogs(30);
      
      this.info('Log rotation completed');
    } catch (error) {
      console.error('Log rotation failed:', error);
    }
  }

  cleanOldLogs(retentionDays) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
      
      const files = fs.readdirSync(this.logDir);
      
      files.forEach(file => {
        if (file.includes('-') && file.endsWith('.log')) {
          const filePath = path.join(this.logDir, file);
          const stats = fs.statSync(filePath);
          
          if (stats.mtime < cutoffDate) {
            fs.unlinkSync(filePath);
            console.log(`Deleted old log file: ${file}`);
          }
        }
      });
    } catch (error) {
      console.error('Error cleaning old logs:', error);
    }
  }

  formatLogMessage(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    const pid = process.pid;
    
    const logEntry = {
      timestamp,
      level,
      message,
      pid,
      ...meta
    };

    // Add stack trace for errors
    if (level === 'error' && meta.error && meta.error.stack) {
      logEntry.stack = meta.error.stack;
    }

    return JSON.stringify(logEntry) + '\n';
  }

  writeToFile(stream, level, message, meta) {
    if (stream && !stream.destroyed) {
      const logMessage = this.formatLogMessage(level, message, meta);
      stream.write(logMessage);
    }
  }

  log(level, message, meta = {}) {
    if (this.logLevels[level] <= this.currentLevel) {
      // Console output with colors
      const colors = {
        error: '\x1b[31m', // Red
        warn: '\x1b[33m',  // Yellow
        info: '\x1b[36m',  // Cyan
        debug: '\x1b[90m'  // Gray
      };
      
      const reset = '\x1b[0m';
      const timestamp = new Date().toISOString();
      
      console.log(
        `${colors[level]}[${timestamp}] ${level.toUpperCase()}:${reset} ${message}`,
        meta && Object.keys(meta).length > 0 ? meta : ''
      );

      // Write to files
      this.writeToFile(this.logStreams.combined, level, message, meta);
      
      if (level === 'error') {
        this.writeToFile(this.logStreams.error, level, message, meta);
      }
    }
  }

  error(message, meta = {}) {
    // If meta contains an Error object, extract details
    if (meta instanceof Error) {
      meta = {
        error: {
          message: meta.message,
          stack: meta.stack,
          name: meta.name
        }
      };
    } else if (meta.error && meta.error instanceof Error) {
      meta.error = {
        message: meta.error.message,
        stack: meta.error.stack,
        name: meta.error.name
      };
    }

    this.log('error', message, meta);
  }

  warn(message, meta = {}) {
    this.log('warn', message, meta);
  }

  info(message, meta = {}) {
    this.log('info', message, meta);
  }

  debug(message, meta = {}) {
    this.log('debug', message, meta);
  }

  // Specialized logging methods
  security(message, meta = {}) {
    const securityMeta = {
      ...meta,
      type: 'security',
      ip: meta.ip || 'unknown',
      userAgent: meta.userAgent || 'unknown'
    };
    
    this.log('warn', message, securityMeta);
    this.writeToFile(this.logStreams.security, 'security', message, securityMeta);
  }

  access(req, res) {
    const meta = {
      type: 'access',
      method: req.method,
      url: req.url,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent') || 'unknown',
      statusCode: res.statusCode,
      contentLength: res.get('Content-Length') || 0,
      responseTime: res.locals.responseTime || 0,
      telegramUser: req.telegramUser ? {
        id: req.telegramUser.id,
        username: req.telegramUser.username
      } : null
    };

    this.writeToFile(this.logStreams.access, 'access', 
      `${req.method} ${req.url} ${res.statusCode}`, meta);
  }

  performance(operation, duration, meta = {}) {
    const perfMeta = {
      type: 'performance',
      operation,
      duration_ms: duration,
      ...meta
    };

    this.log('info', `Performance: ${operation} took ${duration}ms`, perfMeta);
    this.writeToFile(this.logStreams.performance, 'performance', 
      `${operation}: ${duration}ms`, perfMeta);
  }

  // Financial transaction logging (for audit compliance)
  financial(action, details) {
    const financialMeta = {
      type: 'financial',
      action,
      timestamp: new Date().toISOString(),
      ...details
    };

    this.log('info', `Financial: ${action}`, financialMeta);
    
    // Also write to security log for audit trail
    this.writeToFile(this.logStreams.security, 'financial', 
      `Financial transaction: ${action}`, financialMeta);
  }

  // Express middleware for automatic request logging
  expressMiddleware() {
    return (req, res, next) => {
      const startTime = Date.now();
      
      // Capture the original res.end function
      const originalEnd = res.end;
      
      res.end = function(chunk, encoding) {
        res.locals.responseTime = Date.now() - startTime;
        
        // Log the request
        logger.access(req, res);
        
        // Call the original end function
        originalEnd.call(res, chunk, encoding);
      };
      
      next();
    };
  }

  // Get log statistics
  getLogStats() {
    try {
      const stats = {};
      const logFiles = ['error.log', 'combined.log', 'access.log', 'security.log', 'performance.log'];
      
      logFiles.forEach(file => {
        const filePath = path.join(this.logDir, file);
        if (fs.existsSync(filePath)) {
          const fileStats = fs.statSync(filePath);
          stats[file] = {
            size_bytes: fileStats.size,
            size_mb: Math.round(fileStats.size / 1024 / 1024 * 100) / 100,
            modified: fileStats.mtime,
            lines: this.countLines(filePath)
          };
        }
      });
      
      return stats;
    } catch (error) {
      this.error('Failed to get log statistics', { error });
      return {};
    }
  }

  countLines(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      return content.split('\n').length - 1;
    } catch (error) {
      return 0;
    }
  }

  // Search logs (basic implementation)
  searchLogs(query, logType = 'combined', maxResults = 100) {
    try {
      const filePath = path.join(this.logDir, `${logType}.log`);
      
      if (!fs.existsSync(filePath)) {
        return [];
      }

      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n').filter(line => line.trim());
      
      const results = [];
      const regex = new RegExp(query, 'i');
      
      for (const line of lines.reverse()) { // Most recent first
        if (regex.test(line)) {
          try {
            results.push(JSON.parse(line));
          } catch (e) {
            results.push({ raw: line });
          }
          
          if (results.length >= maxResults) {
            break;
          }
        }
      }
      
      return results;
    } catch (error) {
      this.error('Failed to search logs', { error, query, logType });
      return [];
    }
  }

  // Graceful shutdown
  close() {
    Object.values(this.logStreams).forEach(stream => {
      if (stream && !stream.destroyed) {
        stream.end();
      }
    });
  }
}

// Create singleton logger instance
const logger = new Logger();

// Graceful shutdown handling
process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, closing log streams');
  logger.close();
});

process.on('SIGINT', () => {
  logger.info('Received SIGINT, closing log streams');
  logger.close();
  process.exit(0);
});

module.exports = logger;