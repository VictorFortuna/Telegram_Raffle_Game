const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { query } = require('./connection');

class DatabaseBackup {
  constructor() {
    this.backupDir = path.join(__dirname, '..', 'backups');
    this.ensureBackupDirectory();
  }

  ensureBackupDirectory() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  async createBackup() {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFileName = `telegram-raffle-backup-${timestamp}.sql`;
      const backupPath = path.join(this.backupDir, backupFileName);

      console.log(`Creating backup: ${backupFileName}`);

      // Parse DATABASE_URL for pg_dump
      const dbUrl = new URL(process.env.DATABASE_URL);
      const dbConfig = {
        host: dbUrl.hostname,
        port: dbUrl.port || 5432,
        database: dbUrl.pathname.slice(1),
        username: dbUrl.username,
        password: dbUrl.password
      };

      // Create pg_dump command
      const pgDumpArgs = [
        '--host', dbConfig.host,
        '--port', dbConfig.port,
        '--username', dbConfig.username,
        '--dbname', dbConfig.database,
        '--no-password',
        '--verbose',
        '--clean',
        '--no-acl',
        '--no-owner',
        '--format=custom',
        '--file', backupPath
      ];

      const env = { ...process.env, PGPASSWORD: dbConfig.password };

      return new Promise((resolve, reject) => {
        const pgDump = spawn('pg_dump', pgDumpArgs, { env });

        pgDump.stdout.on('data', (data) => {
          console.log(`pg_dump stdout: ${data}`);
        });

        pgDump.stderr.on('data', (data) => {
          console.log(`pg_dump stderr: ${data}`);
        });

        pgDump.on('close', (code) => {
          if (code === 0) {
            console.log(`✓ Backup created successfully: ${backupPath}`);
            this.cleanOldBackups();
            resolve(backupPath);
          } else {
            console.error(`pg_dump exited with code ${code}`);
            reject(new Error(`Backup failed with exit code ${code}`));
          }
        });

        pgDump.on('error', (error) => {
          console.error('pg_dump error:', error);
          reject(error);
        });
      });

    } catch (error) {
      console.error('Backup creation failed:', error);
      throw error;
    }
  }

  async restoreBackup(backupPath) {
    try {
      console.log(`Restoring backup: ${backupPath}`);

      if (!fs.existsSync(backupPath)) {
        throw new Error(`Backup file not found: ${backupPath}`);
      }

      // Parse DATABASE_URL for pg_restore
      const dbUrl = new URL(process.env.DATABASE_URL);
      const dbConfig = {
        host: dbUrl.hostname,
        port: dbUrl.port || 5432,
        database: dbUrl.pathname.slice(1),
        username: dbUrl.username,
        password: dbUrl.password
      };

      const pgRestoreArgs = [
        '--host', dbConfig.host,
        '--port', dbConfig.port,
        '--username', dbConfig.username,
        '--dbname', dbConfig.database,
        '--no-password',
        '--verbose',
        '--clean',
        '--if-exists',
        backupPath
      ];

      const env = { ...process.env, PGPASSWORD: dbConfig.password };

      return new Promise((resolve, reject) => {
        const pgRestore = spawn('pg_restore', pgRestoreArgs, { env });

        pgRestore.stdout.on('data', (data) => {
          console.log(`pg_restore stdout: ${data}`);
        });

        pgRestore.stderr.on('data', (data) => {
          console.log(`pg_restore stderr: ${data}`);
        });

        pgRestore.on('close', (code) => {
          if (code === 0) {
            console.log('✓ Backup restored successfully');
            resolve();
          } else {
            console.error(`pg_restore exited with code ${code}`);
            reject(new Error(`Restore failed with exit code ${code}`));
          }
        });

        pgRestore.on('error', (error) => {
          console.error('pg_restore error:', error);
          reject(error);
        });
      });

    } catch (error) {
      console.error('Backup restoration failed:', error);
      throw error;
    }
  }

  async cleanOldBackups(retentionDays = 7) {
    try {
      const files = fs.readdirSync(this.backupDir);
      const backupFiles = files.filter(file => file.startsWith('telegram-raffle-backup-'));

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      for (const file of backupFiles) {
        const filePath = path.join(this.backupDir, file);
        const stats = fs.statSync(filePath);

        if (stats.mtime < cutoffDate) {
          fs.unlinkSync(filePath);
          console.log(`Deleted old backup: ${file}`);
        }
      }

    } catch (error) {
      console.error('Error cleaning old backups:', error);
    }
  }

  async getBackupList() {
    try {
      const files = fs.readdirSync(this.backupDir);
      const backupFiles = files.filter(file => file.startsWith('telegram-raffle-backup-'));

      return backupFiles.map(file => {
        const filePath = path.join(this.backupDir, file);
        const stats = fs.statSync(filePath);
        return {
          filename: file,
          path: filePath,
          size: stats.size,
          created: stats.mtime
        };
      }).sort((a, b) => b.created - a.created);

    } catch (error) {
      console.error('Error getting backup list:', error);
      return [];
    }
  }

  async healthCheck() {
    try {
      const result = await query('SELECT NOW() as current_time, version() as pg_version');
      console.log('Database health check passed');
      return {
        status: 'healthy',
        timestamp: result.rows[0].current_time,
        version: result.rows[0].pg_version
      };
    } catch (error) {
      console.error('Database health check failed:', error);
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }
}

// CLI interface
if (require.main === module) {
  const backup = new DatabaseBackup();
  const action = process.argv[2];

  switch (action) {
    case 'create':
      backup.createBackup()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
      break;

    case 'restore':
      const backupPath = process.argv[3];
      if (!backupPath) {
        console.error('Usage: node backup.js restore <backup-file-path>');
        process.exit(1);
      }
      backup.restoreBackup(backupPath)
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
      break;

    case 'list':
      backup.getBackupList()
        .then(backups => {
          console.log('Available backups:');
          backups.forEach(backup => {
            console.log(`  ${backup.filename} (${(backup.size / 1024 / 1024).toFixed(2)} MB) - ${backup.created}`);
          });
          process.exit(0);
        })
        .catch(() => process.exit(1));
      break;

    case 'health':
      backup.healthCheck()
        .then(result => {
          console.log('Health check result:', JSON.stringify(result, null, 2));
          process.exit(result.status === 'healthy' ? 0 : 1);
        })
        .catch(() => process.exit(1));
      break;

    case 'clean':
      const days = parseInt(process.argv[3]) || 7;
      backup.cleanOldBackups(days)
        .then(() => {
          console.log(`Cleaned backups older than ${days} days`);
          process.exit(0);
        })
        .catch(() => process.exit(1));
      break;

    default:
      console.log('Usage: node backup.js <create|restore|list|health|clean>');
      console.log('  create                    - Create a new backup');
      console.log('  restore <backup-path>     - Restore from backup file');
      console.log('  list                      - List all available backups');
      console.log('  health                    - Check database health');
      console.log('  clean [days]              - Clean backups older than N days (default: 7)');
      process.exit(1);
  }
}

module.exports = DatabaseBackup;