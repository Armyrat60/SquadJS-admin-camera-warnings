import DiscordBasePlugin from './discord-base-plugin.js';
import axios from 'axios';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

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
        default: ''
      },
      adminRoleID: {
        required: false,
        description: 'Discord role ID to ping for admin camera alerts',
        default: ''
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
        default: '�� ADMIN CAMERA ACTIVATED - {admin} is now monitoring'
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

    // Auto-update functionality (built-in like my-squad-stats.js)
    this.currentVersion = 'v1.0.0';
    this.owner = 'Armyrat60';
    this.repo = 'SquadJS-admin-camera-warnings';
    this.checkVersion = this.checkVersion.bind(this);
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
    
    // Check for updates on mount
    this.checkVersion();
    
    // Set up periodic update checks every 30 minutes (like my-squad-stats.js)
    this.updateInterval = setInterval(this.checkVersion.bind(this), 30 * 60 * 1000);
    
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

  // Auto-update functionality (copied from my-squad-stats.js)
  async checkVersion(latestVersion) {
    if (!latestVersion) {
      try {
        latestVersion = await this.getLatestVersion();
      } catch (error) {
        this.verbose(1, `Error retrieving the latest version of ${this.repo} from ${this.owner}:`, error);
      }
    }

    const __DataDirname = fileURLToPath(import.meta.url);
    // Create Update Cleared File
    const updateClearedFilePath = path.join(
      __DataDirname,
      '..',
      '..',
      'AdminCameraWarnings_Data',
      'update-cleared.json'
    );

    // Create the directory if it does not exist
    const dir = path.dirname(updateClearedFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Create Update Cleared if not exists with cleared: false
    if (!fs.existsSync(updateClearedFilePath)) {
      const data = JSON.stringify({ cleared: false }, null, 2);
      fs.writeFileSync(updateClearedFilePath, data);
    }

    const updateCleared = JSON.parse(fs.readFileSync(updateClearedFilePath));
    if (!updateCleared.cleared) {
      // Delete old Retry json Files due to potential conflicting changes in the code
      const retryPostFilePath = path.join(
        __DataDirname,
        '..',
        '..',
        'AdminCameraWarnings_Data',
        'send-retry-requests.json'
      );
      if (fs.existsSync(retryPostFilePath)) {
        fs.unlinkSync(retryPostFilePath);
      }

      const retryPatchFilePath = path.join(
        __DataDirname,
        '..',
        '..',
        'AdminCameraWarnings_Data',
        'patch-retry-requests.json'
      );
      if (fs.existsSync(retryPatchFilePath)) {
        fs.unlinkSync(retryPatchFilePath);
      }

      // Create/Update the update-cleared.json file
      fs.writeFileSync(
        updateClearedFilePath,
        JSON.stringify({ cleared: true })
      );
    }

    const comparisonResult = await this.compareVersions(
      this.currentVersion,
      latestVersion
    );

    if (comparisonResult < 0) {
      this.verbose(1, `A new version of ${this.repo} is available. Updating...`);

      const updatedCodeUrl = `https://raw.githubusercontent.com/${this.owner}/${this.repo}/${latestVersion}/squad-server/plugins/admin-camera-warnings.js`;

      // Download the updated code
      let updatedCode;
      try {
        const response = await axios.get(updatedCodeUrl);
        updatedCode = response.data;
      } catch (error) {
        this.verbose(
          1,
          `Error downloading the updated plugin for ${this.repo}:`,
          error
        );
        return;
      }

      const __dirname = path.dirname(fileURLToPath(import.meta.url));
      const filePath = path.join(__dirname, 'admin-camera-warnings.js');
      fs.writeFileSync(filePath, updatedCode);

      // Set the update-cleared.json file to false
      fs.writeFileSync(
        updateClearedFilePath,
        JSON.stringify({ cleared: false })
      );

      this.verbose(
        1,
        `Successfully updated ${this.repo} to version ${latestVersion}. Please restart the Node.js process to apply the changes.`
      );
    } else if (comparisonResult > 0) {
      this.verbose(
        1,
        `You are running a newer version of ${this.repo} than the latest version.\nThis likely means you are running a pre-release or beta version.\nYour Current Version: ${this.currentVersion} Latest Version: ${latestVersion}\nhttps://github.com/${this.owner}/${this.repo}/releases`
      );
    } else if (comparisonResult === 0) {
      this.verbose(1, `You are running the latest version of ${this.repo}.`);
    } else {
      this.verbose(1, `Unable to check for updates in ${this.repo}.`);
    }
    return;
  }

  async getLatestVersion() {
    const url = `https://api.github.com/repos/${this.owner}/${this.repo}/releases/latest`;
    const response = await axios.get(url);
    return response.data.tag_name;
  }

  async compareVersions(version1, version2) {
    const v1Parts = version1.replace('v', '').split('.').map(Number);
    const v2Parts = version2.replace('v', '').split('.').map(Number);

    for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
      const v1 = v1Parts[i] || 0;
      const v2 = v2Parts[i] || 0;

      if (v1 > v2) return 1;
      if (v1 < v2) return -1;
    }

    return 0;
  }

  // ... rest of existing code remains the same ...
}
