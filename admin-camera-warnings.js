import DiscordBasePlugin from './discord-base-plugin.js';
import { AutoUpdater } from '../utils/auto-updater.js';
import { fileURLToPath } from 'url';
import path from 'path';

// Plugin version and repository information
const PLUGIN_VERSION = 'v1.0.4';
const GITHUB_OWNER = 'Armyrat60';
const GITHUB_REPO = 'SquadJS-admin-camera-warnings';

export default class AdminCameraWarnings extends DiscordBasePlugin {
  static get description() {
    return (
      'The <code>AdminCameraWarnings</code> plugin provides in-game notifications and Discord alerts when admins enter/leave admin camera, ' +
      'with configurable messages, cooldowns, and enhanced tracking features.'
    );
  }

  static get defaultEnabled() {
    return true;
  }

  static get optionsSpecification() {
    return {
      ...DiscordBasePlugin.optionsSpecification,
      // Discord integration
      channelID: {
        required: false,
        description: 'Discord channel ID for admin camera notifications',
        default: 'default'
      },
      adminRoleID: {
        required: false,
        description: 'Discord role ID to ping for admin camera alerts',
        default: 'default'
      },
      
      // In-game warnings
      enableInGameWarnings: {
        required: false,
        description: 'Enable in-game warnings when admins enter/leave camera',
        default: true
      },
      enableDiscordNotifications: {
        required: false,
        description: 'Enable Discord notifications for admin camera events',
        default: true
      },
      
      // Message customization
      enterMessage: {
        required: false,
        description: 'Message sent to admins when someone enters admin camera',
        default: '🚨 {admin} entered admin camera. Active admins: {count}'
      },
      leaveMessage: {
        required: false,
        description: 'Message sent to admins when someone leaves admin camera',
        default: '✅ {admin} left admin camera. Active admins: {count}'
      },
      includeDuration: {
        required: false,
        description: 'Include duration in leave messages',
        default: true
      },
      durationMessage: {
        required: false,
        description: 'Message format when including duration',
        default: '✅ {admin} left admin camera after {duration}. Active admins: {count}'
      },
      
      // Confirmation messages
      enableConfirmationMessages: {
        required: false,
        description: 'Send confirmation messages to the admin who triggered the event',
        default: true
      },
      enterConfirmation: {
        required: false,
        description: 'Confirmation message sent to admin who entered camera',
        default: 'You entered admin camera. Active admins: {count}'
      },
      leaveConfirmation: {
        required: false,
        description: 'Confirmation message sent to admin who left camera',
        default: 'You left admin camera. Active admins: {count}'
      },
      leaveConfirmationWithDuration: {
        required: false,
        description: 'Confirmation message with duration when admin leaves camera',
        default: 'You left admin camera after {duration}. Active admins: {count}'
      },
      
      // Cooldown and spam protection
      enableCooldown: {
        required: false,
        description: 'Enable cooldown to prevent spam notifications',
        default: true
      },
      cooldownSeconds: {
        required: false,
        description: 'Cooldown time in seconds between notifications for same admin',
        default: 30
      },
      
      // Enhanced features
      enableSessionTracking: {
        required: false,
        description: 'Track admin camera sessions for statistics',
        default: true
      },
      enablePeakTracking: {
        required: false,
        description: 'Track peak admin camera usage',
        default: true
      },
      enableDiscordSessionSummary: {
        required: false,
        description: 'Send Discord summary of admin camera sessions',
        default: false
      },
      
      // Notification settings
      notifyOnFirstEntry: {
        required: false,
        description: 'Send special notification when first admin enters camera',
        default: true
      },
      notifyOnLastExit: {
        required: false,
        description: 'Send special notification when last admin exits camera',
        default: true
      },
      firstEntryMessage: {
        required: false,
        description: 'Message when first admin enters camera',
        default: '🚨 ADMIN CAMERA ACTIVATED - {admin} is now monitoring'
      },
      lastExitMessage: {
        required: false,
        description: 'Message when last admin exits camera',
        default: '✅ ADMIN CAMERA DEACTIVATED - No admins currently monitoring'
      },
      
      // Color customization
      enterColor: {
        required: false,
        description: 'Discord embed color for enter notifications',
        default: 16711680 // Red
      },
      leaveColor: {
        required: false,
        description: 'Discord embed color for leave notifications',
        default: 65280 // Green
      },
      summaryColor: {
        required: false,
        description: 'Discord embed color for session summaries',
        default: 16776960 // Yellow
      }
    };
  }

  constructor(server, options, connectors) {
    super(server, options, connectors);

    // Session tracking
    this.activeSessions = new Map(); // eosID -> session data
    this.sessionHistory = []; // All sessions for current match
    this.cooldowns = new Map(); // eosID -> last notification time
    
    // Statistics
    this.stats = {
      totalSessions: 0,
      totalTime: 0,
      peakUsers: 0,
      peakTime: null,
      firstEntryTime: null,
      lastExitTime: null
    };

    this.onPossessedAdminCamera = this.onPossessedAdminCamera.bind(this);
    this.onUnpossessedAdminCamera = this.onUnpossessedAdminCamera.bind(this);
    this.onNewGame = this.onNewGame.bind(this);
    this.onRoundEnded = this.onRoundEnded.bind(this);

    // Initialize auto-updater utility
    const pluginPath = fileURLToPath(import.meta.url);
    this.autoUpdater = new AutoUpdater(
      'AdminCameraWarnings',
      PLUGIN_VERSION,
      GITHUB_OWNER,
      GITHUB_REPO,
      pluginPath
    );

    // Override the log method to use plugin's verbose system
    this.autoUpdater.log = (message, ...args) => {
      this.verbose(1, message, ...args);
    };

    // Validate Discord configuration
    this.validateDiscordConfig();
  }

  validateDiscordConfig() {
    const hasValidChannel = this.options.channelID && 
                           this.options.channelID !== 'default' && 
                           this.options.channelID !== '';
    
    if (!hasValidChannel) {
      this.verbose(1, '⚠️  Discord channel ID not configured. Discord notifications will be disabled.');
      this.options.enableDiscordNotifications = false;
      this.options.enableDiscordSessionSummary = false;
    } else {
      this.verbose(1, `✅ Discord channel configured: ${this.options.channelID}`);
    }

    const hasValidRole = this.options.adminRoleID && 
                        this.options.adminRoleID !== 'default' && 
                        this.options.adminRoleID !== '';
    
    if (!hasValidRole) {
      this.verbose(1, '⚠️  Discord admin role ID not configured. Role pings will be disabled.');
    } else {
      this.verbose(1, `✅ Discord admin role configured: ${this.options.adminRoleID}`);
    }
  }

  async mount() {
    this.server.on('POSSESSED_ADMIN_CAMERA', this.onPossessedAdminCamera);
    this.server.on('UNPOSSESSED_ADMIN_CAMERA', this.onUnpossessedAdminCamera);
    this.server.on('NEW_GAME', this.onNewGame);
    this.server.on('ROUND_ENDED', this.onRoundEnded);
    
    // Add test commands
    this.server.on('CHAT_COMMAND:!cameratest', this.onCameraTestCommand.bind(this));
    this.server.on('CHAT_COMMAND:!camerastats', this.onCameraStatsCommand.bind(this));
    this.server.on('CHAT_COMMAND:!cameradebug', this.onCameraDebugCommand.bind(this));
    
    // Wait for SquadJS to be fully initialized before checking for updates
    this.verbose(1, `⏳ Waiting for SquadJS to fully initialize before checking for updates...`);
    setTimeout(async () => {
      try {
        this.verbose(1, `🔄 Checking for updates... Current version: ${PLUGIN_VERSION}`);
        const updateResult = await this.autoUpdater.autoUpdate();
        
        if (updateResult.updated) {
          this.verbose(1, `🎉 Plugin updated successfully to version ${updateResult.newVersion}`);
          this.verbose(1, `🔄 Please restart SquadJS to apply the update`);
        } else if (updateResult.error) {
          this.verbose(1, `⚠️  Update check failed: ${updateResult.error}`);
        }
      } catch (error) {
        this.verbose(1, `❌ Update check error: ${error.message}`);
      }
    }, 15000); // Wait 15 seconds for SquadJS to fully initialize
    
    // Set up periodic update checks every 30 minutes
    this.updateInterval = setInterval(async () => {
      try {
        const result = await this.autoUpdater.autoUpdate();
        if (result.updated) {
          this.verbose(1, `🎉 Plugin auto-updated to version ${result.newVersion}`);
          this.verbose(1, `🔄 Please restart SquadJS to apply the update`);
        } else if (result.error) {
          this.verbose(1, `⚠️  Periodic update check failed: ${result.error}`);
        }
      } catch (error) {
        this.verbose(1, `❌ Periodic update check error: ${error.message}`);
      }
    }, 30 * 60 * 1000);
    
    this.verbose(1, '⏰ Auto-update checks scheduled every 30 minutes');
    this.verbose(1, 'AdminCameraWarnings plugin mounted successfully');
  }

  async unmount() {
    this.server.removeEventListener('POSSESSED_ADMIN_CAMERA', this.onPossessedAdminCamera);
    this.server.removeEventListener('UNPOSSESSED_ADMIN_CAMERA', this.onUnpossessedAdminCamera);
    this.server.removeEventListener('NEW_GAME', this.onNewGame);
    this.server.removeEventListener('ROUND_ENDED', this.onRoundEnded);
    this.server.removeEventListener('CHAT_COMMAND:!cameratest', this.onCameraTestCommand);
    this.server.removeEventListener('CHAT_COMMAND:!camerastats', this.onCameraStatsCommand);
    this.server.removeEventListener('CHAT_COMMAND:!cameradebug', this.onCameraDebugCommand);
    
    // Clear update interval
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
  }

  async onNewGame(info) {
    // Reset session tracking for new game
    this.activeSessions.clear();
    this.sessionHistory = [];
    this.cooldowns.clear();
    
    this.stats = {
      totalSessions: 0,
      totalTime: 0,
      peakUsers: 0,
      peakTime: null,
      firstEntryTime: null,
      lastExitTime: null
    };

    this.verbose(1, `New game started - Admin camera tracking reset`);
  }

  async onRoundEnded(info) {
    // Send session summary if enabled
    if (this.options.enableDiscordSessionSummary && this.sessionHistory.length > 0) {
      await this.sendSessionSummary();
    }
  }

  async onPossessedAdminCamera(info) {
    if (!info.player) return;

    const adminEosID = info.player.eosID;
    const currentTime = Date.now();
    const activeCount = this.activeSessions.size;

    // Check cooldown
    if (this.options.enableCooldown && this.isOnCooldown(adminEosID)) {
      this.verbose(1, `Admin ${info.player.name} is on cooldown, skipping notification`);
      return;
    }

    // Create session data
    const session = {
      admin: info.player.name,
      steamID: info.player.steamID,
      eosID: adminEosID,
      startTime: currentTime,
      endTime: null,
      duration: null,
      durationMs: 0
    };

    // Track session
    this.activeSessions.set(adminEosID, session);
    this.sessionHistory.push(session);
    this.stats.totalSessions++;

    // Update statistics
    if (this.activeSessions.size > this.stats.peakUsers) {
      this.stats.peakUsers = this.activeSessions.size;
      this.stats.peakTime = currentTime;
    }

    // Track first entry
    if (this.options.notifyOnFirstEntry && activeCount === 0) {
      this.stats.firstEntryTime = currentTime;
      await this.sendFirstEntryNotification(info.player);
    }

    // Send in-game warnings
    if (this.options.enableInGameWarnings) {
      await this.sendInGameNotifications(info.player, 'enter', this.activeSessions.size);
    }

    // Send Discord notification
    if (this.options.enableDiscordNotifications) {
      await this.sendDiscordNotification(info.player, 'enter', this.activeSessions.size);
    }

    // Set cooldown
    if (this.options.enableCooldown) {
      this.setCooldown(adminEosID);
    }

    this.verbose(1, `Admin ${info.player.name} entered admin camera. Active admins: ${this.activeSessions.size}`);
  }

  async onUnpossessedAdminCamera(info) {
    if (!info.player) return;

    const adminEosID = info.player.eosID;
    const currentTime = Date.now();
    const session = this.activeSessions.get(adminEosID);

    if (session) {
      // Update session data
      session.endTime = currentTime;
      session.durationMs = currentTime - session.startTime;
      session.duration = this.formatDuration(session.durationMs);
      
      // Update statistics
      this.stats.totalTime += session.durationMs;
      this.stats.lastExitTime = currentTime;

      // Remove from active sessions
      this.activeSessions.delete(adminEosID);

      // Check for last exit
      if (this.options.notifyOnLastExit && this.activeSessions.size === 0) {
        await this.sendLastExitNotification(info.player);
      }

      // Send in-game warnings
      if (this.options.enableInGameWarnings) {
        await this.sendInGameNotifications(info.player, 'leave', this.activeSessions.size, session);
      }

      // Send Discord notification
      if (this.options.enableDiscordNotifications) {
        await this.sendDiscordNotification(info.player, 'leave', this.activeSessions.size, session);
      }

      this.verbose(1, `Admin ${info.player.name} left admin camera after ${session.duration}. Active admins: ${this.activeSessions.size}`);
    }
  }

  async sendInGameNotifications(admin, type, activeCount, session = null) {
    try {
      const adminEosIDs = this.server.getAdminsWithPermission('canseeadminchat', 'eosID');
      
      if (adminEosIDs.length === 0) {
        this.verbose(1, 'No admins found with canseeadminchat permission');
        return;
      }

      let message, confirmationMessage;

      if (type === 'enter') {
        message = this.options.enterMessage
          .replace('{admin}', admin.name)
          .replace('{count}', activeCount);
        
        if (this.options.enableConfirmationMessages) {
          confirmationMessage = this.options.enterConfirmation
            .replace('{count}', activeCount);
        }
      } else { // leave
        if (session && session.duration && this.options.includeDuration) {
          message = this.options.durationMessage
            .replace('{admin}', admin.name)
            .replace('{duration}', session.duration)
            .replace('{count}', activeCount);
          
          if (this.options.enableConfirmationMessages) {
            confirmationMessage = this.options.leaveConfirmationWithDuration
              .replace('{duration}', session.duration)
              .replace('{count}', activeCount);
          }
        } else {
          message = this.options.leaveMessage
            .replace('{admin}', admin.name)
            .replace('{count}', activeCount);
          
          if (this.options.enableConfirmationMessages) {
            confirmationMessage = this.options.leaveConfirmation
              .replace('{count}', activeCount);
          }
        }
      }

      let warnedCount = 0;
      for (const player of this.server.players) {
        if (!adminEosIDs.includes(player.eosID)) continue;
        
        try {
          let messageToSend = message;
          
          // Send confirmation to the admin who triggered the event
          if (player.eosID === admin.eosID && confirmationMessage) {
            messageToSend = confirmationMessage;
            this.verbose(1, `Sending confirmation to ${player.name}: ${confirmationMessage}`);
          } else {
            this.verbose(1, `Warning admin ${player.name}: ${message}`);
          }
          
          await this.server.rcon.warn(player.eosID, messageToSend);
          warnedCount++;
        } catch (error) {
          this.verbose(1, `Failed to warn admin ${player.name}: ${error.message}`);
        }
      }
      
      this.verbose(1, `Total admins notified: ${warnedCount}`);
    } catch (error) {
      this.verbose(1, `Error sending in-game notifications: ${error.message}`);
    }
  }

  async sendDiscordNotification(admin, type, activeCount, session = null) {
    if (!this.options.channelID || this.options.channelID === 'default') {
      this.verbose(1, 'Discord channel not configured, skipping notification.');
      return;
    }

    try {
      let title, description, color;

      if (type === 'enter') {
        title = '📹 Admin Camera Activated';
        description = `**${admin.name}** entered admin camera\n**Active Admins:** ${activeCount}`;
        color = this.options.enterColor;
      } else {
        title = '📹 Admin Camera Deactivated';
        if (session && session.duration) {
          description = `**${admin.name}** left admin camera after **${session.duration}**\n**Active Admins:** ${activeCount}`;
        } else {
          description = `**${admin.name}** left admin camera\n**Active Admins:** ${activeCount}`;
        }
        color = this.options.leaveColor;
      }

      const embed = {
        title: title,
        description: description,
        color: color,
        timestamp: new Date().toISOString(),
        footer: {
          text: `${this.server.name || 'Squad Server'}`
        }
      };

      // Add admin role ping if configured
      let content = '';
      if (this.options.adminRoleID && this.options.adminRoleID !== 'default') {
        content = `<@&${this.options.adminRoleID}>`;
      }

      await this.sendDiscordMessage({
        content: content,
        embed: embed
      });

      this.verbose(1, `Discord notification sent for ${type} event`);
    } catch (error) {
      this.verbose(1, `Error sending Discord notification: ${error.message}`);
    }
  }

  async sendFirstEntryNotification(admin) {
    if (!this.options.channelID || this.options.channelID === 'default') {
      this.verbose(1, 'Discord channel not configured, skipping first entry notification.');
      return;
    }

    try {
      const message = this.options.firstEntryMessage.replace('{admin}', admin.name);
      
      const embed = {
        title: '🚨 ADMIN CAMERA ACTIVATED',
        description: message,
        color: this.options.enterColor,
        timestamp: new Date().toISOString(),
        footer: {
          text: `${this.server.name || 'Squad Server'}`
        }
      };

      let content = '';
      if (this.options.adminRoleID && this.options.adminRoleID !== 'default') {
        content = `<@&${this.options.adminRoleID}>`;
      }

      await this.sendDiscordMessage({
        content: content,
        embed: embed
      });

      this.verbose(1, 'First entry Discord notification sent');
    } catch (error) {
      this.verbose(1, `Error sending first entry notification: ${error.message}`);
    }
  }

  async sendLastExitNotification(admin) {
    if (!this.options.channelID || this.options.channelID === 'default') {
      this.verbose(1, 'Discord channel not configured, skipping last exit notification.');
      return;
    }

    try {
      const message = this.options.lastExitMessage;
      
      const embed = {
        title: '✅ ADMIN CAMERA DEACTIVATED',
        description: message,
        color: this.options.leaveColor,
        timestamp: new Date().toISOString(),
        footer: {
          text: `${this.server.name || 'Squad Server'}`
        }
      };

      let content = '';
      if (this.options.adminRoleID && this.options.adminRoleID !== 'default') {
        content = `<@&${this.options.adminRoleID}>`;
      }

      await this.sendDiscordMessage({
        content: content,
        embed: embed
      });

      this.verbose(1, 'Last exit Discord notification sent');
    } catch (error) {
      this.verbose(1, `Error sending last exit notification: ${error.message}`);
    }
  }

  async sendSessionSummary() {
    if (!this.options.channelID || this.options.channelID === 'default') {
      this.verbose(1, 'Discord channel not configured, skipping session summary.');
      return;
    }

    try {
      const fields = [];

      // Session statistics
      fields.push({
        name: '📊 Session Statistics',
        value: `**Total Sessions:** ${this.stats.totalSessions}\n**Total Time:** ${this.formatDuration(this.stats.totalTime)}\n**Peak Users:** ${this.stats.peakUsers}`,
        inline: true
      });

      // Active sessions
      if (this.activeSessions.size > 0) {
        const activeAdmins = Array.from(this.activeSessions.values())
          .map(session => session.admin)
          .join(', ');
        
        fields.push({
          name: '👥 Currently Active',
          value: activeAdmins,
          inline: true
        });
      }

      // Recent sessions
      const recentSessions = this.sessionHistory
        .slice(-5)
        .map(session => {
          const duration = session.duration || 'Active';
          return `**${session.admin}** - ${duration}`;
        })
        .join('\n');

      if (recentSessions) {
        fields.push({
          name: '🕒 Recent Sessions',
          value: recentSessions,
          inline: false
        });
      }

      const embed = {
        title: '📹 Admin Camera Session Summary',
        color: this.options.summaryColor,
        fields: fields,
        timestamp: new Date().toISOString(),
        footer: {
          text: `${this.server.name || 'Squad Server'}`
        }
      };

      await this.sendDiscordMessage({
        embed: embed
      });

      this.verbose(1, 'Session summary sent to Discord');
    } catch (error) {
      this.verbose(1, `Error sending session summary: ${error.message}`);
    }
  }

  // Utility methods
  isOnCooldown(eosID) {
    if (!this.cooldowns.has(eosID)) return false;
    
    const lastNotification = this.cooldowns.get(eosID);
    const cooldownMs = this.options.cooldownSeconds * 1000;
    
    return (Date.now() - lastNotification) < cooldownMs;
  }

  setCooldown(eosID) {
    this.cooldowns.set(eosID, Date.now());
  }

  formatDuration(ms) {
    if (!ms || ms < 0) return '0s';
    
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  }

  // Test commands
  async onCameraTestCommand(info) {
    const player = this.server.getPlayerByEOSID(info.player.eosID);
    if (!player || !this.server.isAdmin(player.steamID)) {
      await this.server.rcon.warn(info.player.eosID, 'You need admin permissions to use this command.');
      return;
    }

    const testMessage = this.options.enterMessage
      .replace('{admin}', 'TestAdmin')
      .replace('{count}', '1');

    await this.server.rcon.warn(info.player.eosID, `Testing admin camera warnings: ${testMessage}`);
    await this.sendInGameNotifications(player, 'enter', 1);
    await this.server.rcon.warn(info.player.eosID, 'Admin camera test completed!');
  }

  async onCameraStatsCommand(info) {
    const player = this.server.getPlayerByEOSID(info.player.eosID);
    if (!player || !this.server.isAdmin(player.steamID)) {
      await this.server.rcon.warn(info.player.eosID, 'You need admin permissions to use this command.');
      return;
    }

    const stats = [
      '=== ADMIN CAMERA STATISTICS ===',
      `Active Sessions: ${this.activeSessions.size}`,
      `Total Sessions: ${this.stats.totalSessions}`,
      `Total Time: ${this.formatDuration(this.stats.totalTime)}`,
      `Peak Users: ${this.stats.peakUsers}`,
      `Peak Time: ${this.stats.peakTime ? new Date(this.stats.peakTime).toLocaleTimeString() : 'N/A'}`,
      '',
      '=== ACTIVE ADMINS ==='
    ];

    if (this.activeSessions.size > 0) {
      for (const [eosID, session] of this.activeSessions) {
        const duration = this.formatDuration(Date.now() - session.startTime);
        stats.push(`${session.admin} - ${duration}`);
      }
    } else {
      stats.push('No active sessions');
    }

    await this.sendSplitWarning(info.player, stats.join('\n'));
  }

  async onCameraDebugCommand(info) {
    const player = this.server.getPlayerByEOSID(info.player.eosID);
    if (!player || !this.server.isAdmin(player.steamID)) {
      await this.server.rcon.warn(info.player.eosID, 'You need admin permissions to use this command.');
      return;
    }

    const debug = [
      '=== ADMIN CAMERA DEBUG ===',
      `Enable In-Game Warnings: ${this.options.enableInGameWarnings}`,
      `Enable Discord Notifications: ${this.options.enableDiscordNotifications}`,
      `Enable Cooldown: ${this.options.enableCooldown}`,
      `Cooldown Seconds: ${this.options.cooldownSeconds}`,
      `Enable Confirmation Messages: ${this.options.enableConfirmationMessages}`,
      '',
      '=== PERMISSIONS ==='
    ];

    const adminEosIDs = this.server.getAdminsWithPermission('canseeadminchat', 'eosID');
    debug.push(`Total Admins: ${adminEosIDs.length}`);
    debug.push(`Online Players: ${this.server.players.length}`);

    let onlineAdmins = 0;
    for (const p of this.server.players) {
      if (adminEosIDs.includes(p.eosID)) onlineAdmins++;
    }
    debug.push(`Online Admins: ${onlineAdmins}`);

    await this.sendSplitWarning(player, debug.join('\n'));
  }

  async sendSplitWarning(player, message, maxLength = 200) {
    try {
      if (message.length <= maxLength) {
        await this.server.rcon.warn(player.eosID, message);
        return;
      }

      const lines = message.split('\n');
      let currentMessage = '';
      
      for (const line of lines) {
        if ((currentMessage + line).length > maxLength) {
          if (currentMessage) {
            await this.server.rcon.warn(player.eosID, currentMessage.trim());
            currentMessage = '';
          }
          
          if (line.length > maxLength) {
            const words = line.split(' ');
            let tempLine = '';
            for (const word of words) {
              if ((tempLine + word).length > maxLength) {
                if (tempLine) {
                  await this.server.rcon.warn(player.eosID, tempLine.trim());
                  tempLine = '';
                }
                tempLine = word + ' ';
              } else {
                tempLine += word + ' ';
              }
            }
            if (tempLine) {
              currentMessage = tempLine;
            }
          } else {
            currentMessage = line + '\n';
          }
        } else {
          currentMessage += line + '\n';
        }
      }
      
      if (currentMessage.trim()) {
        await this.server.rcon.warn(player.eosID, currentMessage.trim());
      }
    } catch (error) {
      this.verbose(1, `Error sending split warning to ${player.name}: ${error.message}`);
    }
  }

  // Auto-update functionality is now handled by the AutoUpdater utility
  // All update logic has been moved to squad-server/utils/auto-updater.js
} 
