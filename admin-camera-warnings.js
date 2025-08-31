import DiscordBasePlugin from './discord-base-plugin.js';
import { AutoUpdater } from '../utils/auto-updater.js';
import { fileURLToPath } from 'url';
import path from 'path';

// Plugin version and repository information
const PLUGIN_VERSION = 'v2.0.1';
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
      discordClient: {
        required: false,
        description: 'Discord connector name to use for notifications',
        default: 'discord'
      },
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

      // Warning scope
      warnOnlyAdminsInCamera: {
        required: false,
        description: 'Only warn admins who are currently in admin camera (instead of all online admins)',
        default: false
      },
      
      // Ignore role for stealth monitoring
      enableIgnoreRole: {
        required: false,
        description: 'Enable ignore role to prevent certain players from triggering warnings',
        default: false
      },
      ignoreRoleSteamIDs: {
        required: false,
        description: 'Array of Steam IDs to ignore (won\'t trigger warnings for other admins)',
        default: []
      },
      ignoreRoleEOSIDs: {
        required: false,
        description: 'Array of EOS IDs to ignore (won\'t trigger warnings for other admins)',
        default: []
      },
      
      // Disconnect tracking (automatic)
      enableDisconnectTracking: {
        required: false,
        description: 'Automatically track admin disconnects and clean up orphaned sessions',
        default: true
      }
    };
  }

  constructor(server, options, connectors) {
    super(server, options, connectors);

    // Session tracking
    this.activeSessions = new Map(); // eosID -> session data
    this.sessionHistory = []; // All sessions for current match
    
    // Disconnect tracking
    this.disconnectTimeouts = new Map(); // eosID -> timeout reference
    this.orphanedSessions = new Map(); // eosID -> orphaned session data
    
    // Statistics
    this.stats = {
      totalSessions: 0,
      totalTime: 0,
      peakUsers: 0,
      peakTime: null,
      firstEntryTime: null,
      lastExitTime: null,
      orphanedSessions: 0,
      disconnectCleanups: 0
    };

    this.onPossessedAdminCamera = this.onPossessedAdminCamera.bind(this);
    this.onUnpossessedAdminCamera = this.onUnpossessedAdminCamera.bind(this);
    this.onNewGame = this.onNewGame.bind(this);
    this.onRoundEnded = this.onRoundEnded.bind(this);
    this.onPlayerDisconnected = this.onPlayerDisconnected.bind(this);
    this.onPlayerConnected = this.onPlayerConnected.bind(this);

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
    this.validateIgnoreRoleConfig();
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

  validateIgnoreRoleConfig() {
    if (!this.options.enableIgnoreRole) {
      this.verbose(1, '🕵️  Ignore role disabled - all admin actions will trigger warnings');
      return;
    }

    const steamIDCount = this.options.ignoreRoleSteamIDs?.length || 0;
    const eosIDCount = this.options.ignoreRoleEOSIDs?.length || 0;
    
    if (steamIDCount === 0 && eosIDCount === 0) {
      this.verbose(1, '⚠️  Ignore role enabled but no IDs configured');
    } else {
      this.verbose(1, `🕵️  Ignore role enabled - ${steamIDCount} Steam IDs and ${eosIDCount} EOS IDs configured`);
      this.verbose(1, `Steam IDs: ${this.options.ignoreRoleSteamIDs?.join(', ') || 'None'}`);
      this.verbose(1, `EOS IDs: ${this.options.ignoreRoleEOSIDs?.join(', ') || 'None'}`);
    }
  }

  async mount() {
    this.server.on('POSSESSED_ADMIN_CAMERA', this.onPossessedAdminCamera);
    this.server.on('UNPOSSESSED_ADMIN_CAMERA', this.onUnpossessedAdminCamera);
    this.server.on('NEW_GAME', this.onNewGame);
    this.server.on('ROUND_ENDED', this.onRoundEnded);
    this.server.on('PLAYER_DISCONNECTED', this.onPlayerDisconnected);
    this.server.on('PLAYER_CONNECTED', this.onPlayerConnected);
    
    // Add test commands
    this.server.on('CHAT_COMMAND:!cameratest', this.onCameraTestCommand.bind(this));
    this.server.on('CHAT_COMMAND:!camerastats', this.onCameraStatsCommand.bind(this));
    this.server.on('CHAT_COMMAND:!cameradebug', this.onCameraDebugCommand.bind(this));
    this.server.on('CHAT_COMMAND:!cameraupdate', this.onCameraUpdateCommand.bind(this));
    this.server.on('CHAT_COMMAND:!cameraignore', this.onCameraIgnoreCommand.bind(this));
    
    // Wait for SquadJS to be fully initialized before checking for updates
    this.verbose(1, `⏳ Waiting for SquadJS to fully initialize before checking for updates...`);
    setTimeout(async () => {
      try {
        this.verbose(1, `🔄 Checking for updates... Current version: ${PLUGIN_VERSION}`);
        const updateResult = await this.autoUpdater.autoUpdate();
        
        if (updateResult.updated) {
          this.verbose(1, `🎉 Plugin updated successfully to version ${updateResult.newVersion}`);
          this.verbose(1, `🔄 Please restart SquadJS to apply the update`);
          
          // Emit event for AutoUpdatePlugin to handle
          this.server.emit('PLUGIN_UPDATED', 'AdminCameraWarnings', PLUGIN_VERSION, updateResult.newVersion, updateResult.backupPath);
          this.server.emit('RESTART_REQUIRED', 'AdminCameraWarnings');
        } else if (updateResult.error) {
          this.verbose(1, `⚠️  Update check failed: ${updateResult.error}`);
        } else {
          this.verbose(1, `✅ Plugin is up to date or no update needed`);
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
          
          // Emit event for AutoUpdatePlugin to handle
          this.server.emit('PLUGIN_UPDATED', 'AdminCameraWarnings', PLUGIN_VERSION, result.newVersion, result.backupPath);
          this.server.emit('RESTART_REQUIRED', 'AdminCameraWarnings');
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
    this.server.removeEventListener('PLAYER_DISCONNECTED', this.onPlayerDisconnected);
    this.server.removeEventListener('PLAYER_CONNECTED', this.onPlayerConnected);
    this.server.removeEventListener('CHAT_COMMAND:!cameratest', this.onCameraTestCommand);
    this.server.removeEventListener('CHAT_COMMAND:!camerastats', this.onCameraStatsCommand);
    this.server.removeEventListener('CHAT_COMMAND:!cameradebug', this.onCameraDebugCommand);
    this.server.removeEventListener('CHAT_COMMAND:!cameraupdate', this.onCameraUpdateCommand);
    this.server.removeEventListener('CHAT_COMMAND:!cameraignore', this.onCameraIgnoreCommand);
    
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
    
    // Clear disconnect tracking
    for (const timeout of this.disconnectTimeouts.values()) {
      clearTimeout(timeout);
    }
    this.disconnectTimeouts.clear();
    this.orphanedSessions.clear();
    
    this.stats = {
      totalSessions: 0,
      totalTime: 0,
      peakUsers: 0,
      peakTime: null,
      firstEntryTime: null,
      lastExitTime: null,
      orphanedSessions: 0,
      disconnectCleanups: 0
    };

    this.verbose(1, `New game started - Admin camera tracking reset`);
  }

  async onRoundEnded(info) {
    // Send session summary if enabled
    if (this.options.enableDiscordSessionSummary && this.sessionHistory.length > 0) {
      await this.sendSessionSummary();
    }
  }

  async onPlayerDisconnected(info) {
    if (!this.options.enableDisconnectTracking || !info.player) return;

    const playerEosID = info.player.eosID;
    const session = this.activeSessions.get(playerEosID);

    if (session) {
      this.verbose(1, `Admin ${info.player.name} disconnected while in admin camera, setting cleanup timeout`);
      
      // Set a timeout to clean up the session if they don't reconnect
      const timeout = setTimeout(() => {
        this.cleanupOrphanedSession(playerEosID, info.player.name);
      }, this.options.disconnectTimeoutSeconds * 1000);

      this.disconnectTimeouts.set(playerEosID, timeout);
      this.orphanedSessions.set(playerEosID, {
        ...session,
        disconnectTime: Date.now(),
        playerName: info.player.name
      });
    }
  }

  async onPlayerConnected(info) {
    if (!this.options.enableDisconnectTracking || !info.player) return;

    const playerEosID = info.player.eosID;
    const timeout = this.disconnectTimeouts.get(playerEosID);
    const orphanedSession = this.orphanedSessions.get(playerEosID);

    if (timeout) {
      // Clear the disconnect timeout since they reconnected
      clearTimeout(timeout);
      this.disconnectTimeouts.delete(playerEosID);
      this.verbose(1, `Admin ${info.player.name} reconnected, cleared disconnect timeout`);
    }

    if (orphanedSession) {
      // Remove from orphaned sessions since they reconnected
      this.orphanedSessions.delete(playerEosID);
      this.verbose(1, `Admin ${info.player.name} reconnected, restored from orphaned sessions`);
    }
  }

  async onPossessedAdminCamera(info) {
    if (!info.player) return;

    const adminEosID = info.player.eosID;
    const currentTime = Date.now();
    const activeCount = this.activeSessions.size;



    // Check ignore role
    if (this.options.enableIgnoreRole && this.isPlayerIgnored(info.player)) {
      this.verbose(1, `Admin ${info.player.name} is in ignore role, skipping notification`);
      
      // Warn the player that they're on the ignored list
      try {
        await this.server.rcon.warn(info.player.eosID, '🕵️ You are on the stealth monitoring list. Your admin camera actions will not alert other admins.');
      } catch (error) {
        this.verbose(1, `Failed to warn ignored player ${info.player.name}: ${error.message}`);
      }
      
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



    this.verbose(1, `Admin ${info.player.name} entered admin camera. Active admins: ${this.activeSessions.size}`);
  }

  async onUnpossessedAdminCamera(info) {
    if (!info.player) return;

    const adminEosID = info.player.eosID;
    const currentTime = Date.now();
    const session = this.activeSessions.get(adminEosID);

    // Check ignore role for leave notifications
    if (this.options.enableIgnoreRole && this.isPlayerIgnored(info.player)) {
      this.verbose(1, `Admin ${info.player.name} is in ignore role, skipping leave notification.`);
      
      // Warn the player that they're on the ignored list
      try {
        await this.server.rcon.warn(info.player.eosID, '🕵️ You are on the stealth monitoring list. Your admin camera actions will not alert other admins.');
      } catch (error) {
        this.verbose(1, `Failed to warn ignored player ${info.player.name}: ${error.message}`);
      }
      
      return;
    }

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
      let adminEosIDs;
      
      if (this.options.warnOnlyAdminsInCamera) {
        // Only warn admins who are currently in admin camera
        adminEosIDs = Array.from(this.activeSessions.keys());
        this.verbose(1, `Warning only admins in camera: ${adminEosIDs.length} admins`);
      } else {
        // Warn all online admins with canseeadminchat permission
        adminEosIDs = this.server.getAdminsWithPermission('canseeadminchat', 'eosID');
        this.verbose(1, `Warning all online admins: ${adminEosIDs.length} admins`);
      }
      
      if (adminEosIDs.length === 0) {
        this.verbose(1, 'No admins to notify');
        return;
      }

      let message, confirmationMessage;

      if (type === 'enter') {
        message = `🚨 ${admin.name} entered admin camera. Active admins: ${activeCount}`;
        confirmationMessage = `You entered admin camera. Active admins: ${activeCount}`;
      } else { // leave
        if (session && session.duration) {
          message = `✅ ${admin.name} left admin camera after ${session.duration}. Active admins: ${activeCount}`;
          confirmationMessage = `You left admin camera after ${session.duration}. Active admins: ${activeCount}`;
        } else {
          message = `✅ ${admin.name} left admin camera. Active admins: ${activeCount}`;
          confirmationMessage = `You left admin camera. Active admins: ${activeCount}`;
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

  async sendOrphanedSessionNotification(playerName, session) {
    if (!this.options.channelID || this.options.channelID === 'default') {
      this.verbose(1, 'Discord channel not configured, skipping orphaned session notification.');
      return;
    }

    try {
      const embed = {
        title: '⚠️ ADMIN CAMERA SESSION ORPHANED',
        description: `**${playerName}** disconnected while in admin camera\n**Session Duration:** ${session.duration}\n**Reason:** Disconnect/Crash/Alt+F4`,
        color: 16776960, // Yellow
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

      this.verbose(1, 'Orphaned session Discord notification sent');
    } catch (error) {
      this.verbose(1, `Error sending orphaned session notification: ${error.message}`);
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

      // Disconnect tracking statistics
      if (this.options.enableDisconnectTracking) {
        fields.push({
          name: '⚠️ Disconnect Tracking',
          value: `**Orphaned Sessions:** ${this.stats.orphanedSessions}\n**Cleanups:** ${this.stats.disconnectCleanups}`,
          inline: true
        });
      }

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



  isPlayerIgnored(player) {
    if (!this.options.enableIgnoreRole) return false;
    
    const isSteamIDIgnored = this.options.ignoreRoleSteamIDs?.includes(player.steamID);
    const isEOSIDIgnored = this.options.ignoreRoleEOSIDs?.includes(player.eosID);
    
    return isSteamIDIgnored || isEOSIDIgnored;
  }

  cleanupOrphanedSession(eosID, playerName) {
    const session = this.activeSessions.get(eosID);
    if (!session) return;

    const currentTime = Date.now();
    session.endTime = currentTime;
    session.durationMs = currentTime - session.startTime;
    session.duration = this.formatDuration(session.durationMs);
    session.orphaned = true;
    session.orphanReason = 'disconnect';

    // Update statistics
    this.stats.totalTime += session.durationMs;
    this.stats.orphanedSessions++;
    this.stats.disconnectCleanups++;

    // Remove from active sessions
    this.activeSessions.delete(eosID);
    this.disconnectTimeouts.delete(eosID);
    this.orphanedSessions.delete(eosID);

    // Send Discord notification about orphaned session
    if (this.options.enableDiscordNotifications) {
      this.sendOrphanedSessionNotification(playerName, session);
    }

    this.verbose(1, `Cleaned up orphaned session for ${playerName} after ${session.duration} (disconnected)`);
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

    const testMessage = `🚨 TestAdmin entered admin camera. Active admins: 1`;

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
      '=== DISCONNECT TRACKING ===',
      `Orphaned Sessions: ${this.stats.orphanedSessions}`,
      `Disconnect Cleanups: ${this.stats.disconnectCleanups}`,
      `Current Timeouts: ${this.disconnectTimeouts.size}`,
      `Orphaned Sessions: ${this.orphanedSessions.size}`,
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
      '',
      '=== NEW FEATURES ===',
      `Warn Only Admins In Camera: ${this.options.warnOnlyAdminsInCamera}`,
      `Enable Ignore Role: ${this.options.enableIgnoreRole}`,
      `Enable Disconnect Tracking: ${this.options.enableDisconnectTracking}`,
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

  // Manual update command for admins
  async onCameraUpdateCommand(info) {
    const player = this.server.getPlayerByEOSID(info.player.eosID);
    if (!player || !this.server.isAdmin(player.steamID)) {
      await this.server.rcon.warn(info.player.eosID, 'You need admin permissions to use this command.');
      return;
    }

    try {
      await this.server.rcon.warn(info.player.eosID, '🔄 Manually checking for updates...');
      
      const updateResult = await this.autoUpdater.autoUpdate();
      
      if (updateResult.updated) {
        await this.server.rcon.warn(info.player.eosID, `🎉 Plugin updated to version ${updateResult.newVersion}`);
        await this.server.rcon.warn(info.player.eosID, '🔄 Please restart SquadJS to apply the update');
        
        // Emit event for AutoUpdatePlugin to handle
        this.server.emit('PLUGIN_UPDATED', 'AdminCameraWarnings', PLUGIN_VERSION, updateResult.newVersion, updateResult.backupPath);
        this.server.emit('RESTART_REQUIRED', 'AdminCameraWarnings');
      } else if (updateResult.error) {
        await this.server.rcon.warn(info.player.eosID, `⚠️ Update check failed: ${updateResult.error}`);
      } else {
        await this.server.rcon.warn(info.player.eosID, '✅ Plugin is up to date');
      }
    } catch (error) {
      await this.server.rcon.warn(info.player.eosID, `❌ Update check error: ${error.message}`);
    }
  }

  // Ignore role management command for admins
  async onCameraIgnoreCommand(info) {
    const player = this.server.getPlayerByEOSID(info.player.eosID);
    if (!player || !this.server.isAdmin(player.steamID)) {
      await this.server.rcon.warn(info.player.eosID, 'You need admin permissions to use this command.');
      return;
    }

    const args = info.message.split(' ').slice(1);
    if (args.length === 0) {
      // Show current ignore role status
      const status = [
        '=== IGNORE ROLE STATUS ===',
        `Enabled: ${this.options.enableIgnoreRole}`,
        '',
        '=== STEAM IDs ===',
        ...(this.options.ignoreRoleSteamIDs?.length > 0 ? this.options.ignoreRoleSteamIDs : ['None configured']),
        '',
        '=== EOS IDs ===',
        ...(this.options.ignoreRoleEOSIDs?.length > 0 ? this.options.ignoreRoleEOSIDs : ['None configured']),
        '',
        'Usage: !cameraignore <add/remove> <steam/eos> <ID>'
      ];
      
      await this.sendSplitWarning(player, status.join('\n'));
      return;
    }

    if (args.length < 3) {
      await this.server.rcon.warn(player.eosID, 'Usage: !cameraignore <add/remove> <steam/eos> <ID>');
      return;
    }

    const action = args[0].toLowerCase();
    const idType = args[1].toLowerCase();
    const id = args[2];

    if (action !== 'add' && action !== 'remove') {
      await this.server.rcon.warn(player.eosID, 'Invalid action. Use "add" or "remove"');
      return;
    }

    if (idType !== 'steam' && idType !== 'eos') {
      await this.server.rcon.warn(player.eosID, 'Invalid ID type. Use "steam" or "eos"');
      return;
    }

    try {
      if (action === 'add') {
        if (idType === 'steam') {
          if (!this.options.ignoreRoleSteamIDs) this.options.ignoreRoleSteamIDs = [];
          if (!this.options.ignoreRoleSteamIDs.includes(id)) {
            this.options.ignoreRoleSteamIDs.push(id);
            await this.server.rcon.warn(player.eosID, `✅ Added Steam ID ${id} to ignore role`);
          } else {
            await this.server.rcon.warn(player.eosID, `⚠️ Steam ID ${id} is already in ignore role`);
          }
        } else {
          if (!this.options.ignoreRoleEOSIDs) this.options.ignoreRoleEOSIDs = [];
          if (!this.options.ignoreRoleEOSIDs.includes(id)) {
            this.options.ignoreRoleEOSIDs.push(id);
            await this.server.rcon.warn(player.eosID, `✅ Added EOS ID ${id} to ignore role`);
          } else {
            await this.server.rcon.warn(player.eosID, `⚠️ EOS ID ${id} is already in ignore role`);
          }
        }
      } else { // remove
        if (idType === 'steam') {
          if (this.options.ignoreRoleSteamIDs?.includes(id)) {
            this.options.ignoreRoleSteamIDs = this.options.ignoreRoleSteamIDs.filter(sid => sid !== id);
            await this.server.rcon.warn(player.eosID, `✅ Removed Steam ID ${id} from ignore role`);
          } else {
            await this.server.rcon.warn(player.eosID, `⚠️ Steam ID ${id} is not in ignore role`);
          }
        } else {
          if (this.options.ignoreRoleEOSIDs?.includes(id)) {
            this.options.ignoreRoleEOSIDs = this.options.ignoreRoleEOSIDs.filter(eid => eid !== id);
            await this.server.rcon.warn(player.eosID, `✅ Removed EOS ID ${id} from ignore role`);
          } else {
            await this.server.rcon.warn(player.eosID, `⚠️ EOS ID ${id} is not in ignore role`);
          }
        }
      }

      // Re-validate configuration
      this.validateIgnoreRoleConfig();
    } catch (error) {
      await this.server.rcon.warn(player.eosID, `❌ Error managing ignore role: ${error.message}`);
    }
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
