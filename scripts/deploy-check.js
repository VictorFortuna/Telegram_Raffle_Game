#!/usr/bin/env node

const axios = require('axios');
const HealthCheck = require('../monitoring/healthcheck');
const DomainSetup = require('./setup-domain');

class DeploymentChecker {
  constructor() {
    this.healthCheck = new HealthCheck();
    this.domainSetup = new DomainSetup();
    this.baseUrl = process.env.RAILWAY_STATIC_URL || process.env.BASE_URL || 'http://localhost:3000';
    if (!this.baseUrl.startsWith('http')) {
      this.baseUrl = `https://${this.baseUrl}`;
    }
  }

  async runAllChecks() {
    console.log('🚀 Starting deployment verification...\n');
    
    const results = {
      timestamp: new Date().toISOString(),
      baseUrl: this.baseUrl,
      checks: {},
      overall: 'pending'
    };

    const checks = [
      { name: 'environment', method: 'checkEnvironment' },
      { name: 'health', method: 'checkHealthEndpoint' },
      { name: 'database', method: 'checkDatabase' },
      { name: 'telegram', method: 'checkTelegramIntegration' },
      { name: 'webhook', method: 'checkWebhook' },
      { name: 'security', method: 'checkSecurity' },
      { name: 'game', method: 'checkGameInterface' },
      { name: 'admin', method: 'checkAdminPanel' },
      { name: 'websocket', method: 'checkWebSocket' }
    ];

    let passedChecks = 0;
    let totalChecks = checks.length;

    for (const check of checks) {
      try {
        console.log(`⏳ Checking ${check.name}...`);
        const result = await this[check.method]();
        results.checks[check.name] = result;
        
        if (result.status === 'pass') {
          console.log(`✅ ${check.name}: ${result.message}`);
          passedChecks++;
        } else if (result.status === 'warn') {
          console.log(`⚠️  ${check.name}: ${result.message}`);
          passedChecks += 0.5; // Partial credit for warnings
        } else {
          console.log(`❌ ${check.name}: ${result.message}`);
        }
      } catch (error) {
        console.log(`❌ ${check.name}: ${error.message}`);
        results.checks[check.name] = {
          status: 'fail',
          message: error.message,
          error: error.stack
        };
      }
      console.log(''); // Empty line for readability
    }

    // Overall status
    const successRate = passedChecks / totalChecks;
    if (successRate >= 0.9) {
      results.overall = 'pass';
      console.log('🎉 Deployment verification PASSED!');
    } else if (successRate >= 0.7) {
      results.overall = 'warn';
      console.log('⚠️  Deployment verification completed with WARNINGS');
    } else {
      results.overall = 'fail';
      console.log('❌ Deployment verification FAILED');
    }

    console.log(`\nScore: ${Math.round(successRate * 100)}% (${passedChecks}/${totalChecks} checks passed)`);
    
    return results;
  }

  async checkEnvironment() {
    const requiredVars = [
      'DATABASE_URL',
      'TELEGRAM_BOT_TOKEN',
      'JWT_SECRET',
      'ADMIN_PASSWORD_HASH'
    ];

    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length === 0) {
      return {
        status: 'pass',
        message: 'All required environment variables are set',
        details: { required: requiredVars.length, missing: 0 }
      };
    } else {
      return {
        status: 'fail',
        message: `Missing environment variables: ${missingVars.join(', ')}`,
        details: { required: requiredVars.length, missing: missingVars }
      };
    }
  }

  async checkHealthEndpoint() {
    try {
      const response = await axios.get(`${this.baseUrl}/health`, { timeout: 10000 });
      
      if (response.status === 200 && response.data.status === 'OK') {
        return {
          status: 'pass',
          message: 'Health endpoint is responding correctly',
          details: response.data
        };
      } else {
        return {
          status: 'fail',
          message: `Health endpoint returned unexpected response: ${response.status}`,
          details: response.data
        };
      }
    } catch (error) {
      return {
        status: 'fail',
        message: `Health endpoint is not accessible: ${error.message}`,
        error: error.message
      };
    }
  }

  async checkDatabase() {
    try {
      const result = await this.healthCheck.runCheck('database');
      
      if (result.status === 'healthy') {
        return {
          status: 'pass',
          message: 'Database connection is healthy',
          details: result.details
        };
      } else {
        return {
          status: 'fail',
          message: `Database check failed: ${result.error || 'Unknown error'}`,
          details: result
        };
      }
    } catch (error) {
      return {
        status: 'fail',
        message: `Database check error: ${error.message}`,
        error: error.message
      };
    }
  }

  async checkTelegramIntegration() {
    try {
      const result = await this.healthCheck.runCheck('telegram_api');
      
      if (result.status === 'healthy') {
        return {
          status: 'pass',
          message: 'Telegram Bot API is responding',
          details: result.details
        };
      } else {
        return {
          status: 'fail',
          message: `Telegram API check failed: ${result.error}`,
          details: result
        };
      }
    } catch (error) {
      return {
        status: 'fail',
        message: `Telegram integration check error: ${error.message}`,
        error: error.message
      };
    }
  }

  async checkWebhook() {
    try {
      const webhookInfo = await this.domainSetup.getTelegramWebhookInfo();
      const sslTest = await this.domainSetup.testWebhookSSL();
      
      if (webhookInfo.url && sslTest.accessible) {
        return {
          status: 'pass',
          message: 'Webhook is configured and SSL is working',
          details: { webhook: webhookInfo, ssl: sslTest }
        };
      } else if (webhookInfo.url && !sslTest.accessible) {
        return {
          status: 'fail',
          message: 'Webhook is set but SSL test failed',
          details: { webhook: webhookInfo, ssl: sslTest }
        };
      } else {
        return {
          status: 'warn',
          message: 'Webhook is not configured - manual setup required',
          details: { webhook: webhookInfo }
        };
      }
    } catch (error) {
      return {
        status: 'warn',
        message: `Webhook check incomplete: ${error.message}`,
        error: error.message
      };
    }
  }

  async checkSecurity() {
    try {
      const response = await axios.get(`${this.baseUrl}/health`, { timeout: 5000 });
      const headers = response.headers;
      
      const securityHeaders = {
        'x-powered-by': !headers['x-powered-by'], // Should be removed
        'strict-transport-security': !!headers['strict-transport-security'],
        'x-frame-options': !!headers['x-frame-options'],
        'x-content-type-options': !!headers['x-content-type-options']
      };
      
      const securityScore = Object.values(securityHeaders).filter(Boolean).length;
      const totalHeaders = Object.keys(securityHeaders).length;
      
      if (securityScore >= totalHeaders - 1) {
        return {
          status: 'pass',
          message: 'Security headers are properly configured',
          details: { headers: securityHeaders, score: `${securityScore}/${totalHeaders}` }
        };
      } else {
        return {
          status: 'warn',
          message: `Some security headers missing (${securityScore}/${totalHeaders})`,
          details: { headers: securityHeaders }
        };
      }
    } catch (error) {
      return {
        status: 'fail',
        message: `Security check failed: ${error.message}`,
        error: error.message
      };
    }
  }

  async checkGameInterface() {
    try {
      const response = await axios.get(`${this.baseUrl}/game`, { timeout: 10000 });
      
      if (response.status === 200 && response.data.includes('Raffle')) {
        return {
          status: 'pass',
          message: 'Game interface is loading correctly',
          details: { status: response.status, contentLength: response.data.length }
        };
      } else {
        return {
          status: 'fail',
          message: `Game interface returned unexpected response: ${response.status}`,
          details: { status: response.status }
        };
      }
    } catch (error) {
      return {
        status: 'fail',
        message: `Game interface is not accessible: ${error.message}`,
        error: error.message
      };
    }
  }

  async checkAdminPanel() {
    try {
      const response = await axios.get(`${this.baseUrl}/admin`, { timeout: 10000 });
      
      if (response.status === 200 && (response.data.includes('admin') || response.data.includes('Admin'))) {
        return {
          status: 'pass',
          message: 'Admin panel is loading correctly',
          details: { status: response.status }
        };
      } else {
        return {
          status: 'fail',
          message: `Admin panel returned unexpected response: ${response.status}`,
          details: { status: response.status }
        };
      }
    } catch (error) {
      return {
        status: 'fail',
        message: `Admin panel is not accessible: ${error.message}`,
        error: error.message
      };
    }
  }

  async checkWebSocket() {
    try {
      const result = await this.healthCheck.runCheck('websocket');
      
      if (result.status === 'healthy' || result.status === 'warning') {
        return {
          status: 'pass',
          message: 'WebSocket system is available',
          details: result.details
        };
      } else {
        return {
          status: 'warn',
          message: 'WebSocket check returned warnings',
          details: result
        };
      }
    } catch (error) {
      return {
        status: 'warn',
        message: `WebSocket check incomplete: ${error.message}`,
        error: error.message
      };
    }
  }

  async generateReport(results) {
    const reportPath = 'deployment-report.json';
    const fs = require('fs');
    
    fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
    console.log(`📄 Detailed report saved to: ${reportPath}`);
    
    // Generate summary
    console.log('\n📊 DEPLOYMENT SUMMARY:');
    console.log('═'.repeat(50));
    
    Object.entries(results.checks).forEach(([name, result]) => {
      const status = result.status === 'pass' ? '✅' : result.status === 'warn' ? '⚠️' : '❌';
      console.log(`${status} ${name.padEnd(12)} - ${result.message}`);
    });
    
    console.log('═'.repeat(50));
    console.log(`🎯 Overall Status: ${results.overall.toUpperCase()}`);
    console.log(`🕒 Checked at: ${results.timestamp}`);
    console.log(`🌐 Base URL: ${results.baseUrl}`);
    
    return reportPath;
  }
}

// CLI interface
if (require.main === module) {
  const checker = new DeploymentChecker();
  const action = process.argv[2];

  switch (action) {
    case 'all':
    case 'check':
    default:
      checker.runAllChecks()
        .then(async (results) => {
          await checker.generateReport(results);
          process.exit(results.overall === 'pass' ? 0 : 1);
        })
        .catch((error) => {
          console.error('❌ Deployment check failed:', error.message);
          process.exit(1);
        });
      break;

    case 'quick':
      // Quick health check only
      checker.checkHealthEndpoint()
        .then((result) => {
          console.log(result.status === 'pass' ? '✅ Quick check passed' : '❌ Quick check failed');
          console.log(result.message);
          process.exit(result.status === 'pass' ? 0 : 1);
        })
        .catch((error) => {
          console.error('❌ Quick check failed:', error.message);
          process.exit(1);
        });
      break;

    case 'help':
      console.log('Usage: node deploy-check.js [command]');
      console.log('Commands:');
      console.log('  all, check  - Run all deployment checks (default)');
      console.log('  quick       - Quick health check only');
      console.log('  help        - Show this help message');
      break;
  }
}

module.exports = DeploymentChecker;