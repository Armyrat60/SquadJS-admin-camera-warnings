# Admin Camera Warnings Plugin

A SquadJS plugin that provides in-game notifications and Discord alerts when admins enter/leave admin camera, with configurable messages, cooldowns, enhanced tracking features, and stealth monitoring capabilities.

## 📦 Installation

1. Place `admin-camera-warnings.js` in your `squad-server/plugins/` directory
2. Add the plugin to your SquadJS configuration
3. Configure Discord settings (optional)

## ✨ Features

- **📹 Admin Camera Monitoring**: Real-time tracking of admin camera usage
- **📱 Discord Notifications**: Rich Discord embeds with role pings
- **🎮 In-Game Warnings**: Admin chat notifications for camera events
- **🕵️ Stealth Monitoring**: Ignore list for stealth admin monitoring
- **📊 Session Tracking**: Detailed statistics and session history
- **🔄 Auto-Updates**: Integrated with UpdateManager for automatic updates
- **⚡ Disconnect Handling**: Automatic cleanup of orphaned sessions
- **🎯 Smart Notifications**: Configurable warning scope and timing
- **📈 Peak Tracking**: Monitor peak admin camera usage
- **🔍 Debug Commands**: Admin commands for testing and monitoring

## 🚀 Quick Start

### 1. Basic Configuration (No Discord)
```json
{
  "plugin": "AdminCameraWarnings",
  "enabled": true
}
```

### 2. Full Configuration (With Discord)
```json
{
  "plugin": "AdminCameraWarnings",
  "enabled": true,
  "discordClient": "discord",
  "channelID": "your-discord-channel-id",
  "adminRoleID": "your-admin-role-id",
  "enableInGameWarnings": true,
  "enableDiscordNotifications": true,
  "enableSessionTracking": true,
  "enablePeakTracking": true,
  "notifyOnFirstEntry": true,
  "notifyOnLastExit": true,
  "warnOnlyAdminsInCamera": false,
  "enableIgnoreRole": false,
  "enableDisconnectTracking": true
}
```

## ⚙️ Configuration Options

### Required Settings
- **`plugin`**: Must be `"AdminCameraWarnings"`
- **`enabled`**: Enable/disable the plugin

### Discord Integration (Optional)
- **`discordClient`**: Discord connector name (default: `"discord"`)
- **`channelID`**: Discord channel ID for notifications (default: `"default"`)
- **`adminRoleID`**: Discord role ID to ping for alerts (default: `"default"`)

### Notification Settings
- **`enableInGameWarnings`**: Enable in-game admin chat warnings (default: `true`)
- **`enableDiscordNotifications`**: Enable Discord notifications (default: `true`)

### Enhanced Features
- **`enableSessionTracking`**: Track admin camera sessions for statistics (default: `true`)
- **`enablePeakTracking`**: Track peak admin camera usage (default: `true`)
- **`enableDiscordSessionSummary`**: Send Discord summary of admin camera sessions (default: `false`)

### Notification Behavior
- **`notifyOnFirstEntry`**: Send special notification when first admin enters camera (default: `true`)
- **`notifyOnLastExit`**: Send special notification when last admin exits camera (default: `true`)
- **`warnOnlyAdminsInCamera`**: Only warn admins currently in camera (default: `false`)

### Stealth Monitoring
- **`enableIgnoreRole`**: Enable ignore role for stealth monitoring (default: `false`)
- **`ignoreRoleSteamIDs`**: Array of Steam IDs to ignore (default: `[]`)
- **`ignoreRoleEOSIDs`**: Array of EOS IDs to ignore (default: `[]`)

### Disconnect Tracking
- **`enableDisconnectTracking`**: Automatically track admin disconnects (default: `true`)

## 💬 Admin Commands

**Where to use**: Type these commands in-game as an admin.

### Available Commands

- **`!cameratest`** - Test admin camera warning system
- **`!camerastats`** - Show detailed camera statistics
- **`!cameradebug`** - Show debug information and settings
- **`!cameraignore`** - Manage ignore list for stealth monitoring

### Command Examples
```
!cameratest
!camerastats
!cameradebug
!cameraignore
!cameraignore add steam 76561198000000000
!cameraignore add eos abc123def456
!cameraignore remove steam 76561198000000000
```

### Command Details

#### `!cameratest`
- Tests the warning system
- Sends test notifications to all admins
- Confirms the system is working

#### `!camerastats`
- Shows current session statistics
- Displays peak usage information
- Shows disconnect tracking data
- Lists currently active admins

#### `!cameradebug`
- Shows configuration settings
- Displays permission information
- Shows online admin count
- Useful for troubleshooting

#### `!cameraignore`
- **`!cameraignore`** - Show current ignore list status
- **`!cameraignore add steam <ID>`** - Add Steam ID to ignore list
- **`!cameraignore add eos <ID>`** - Add EOS ID to ignore list
- **`!cameraignore remove steam <ID>`** - Remove Steam ID from ignore list
- **`!cameraignore remove eos <ID>`** - Remove EOS ID from ignore list

## 🔄 How It Works

### 1. Admin Camera Monitoring
1. **Enter Detection**: Monitors `POSSESSED_ADMIN_CAMERA` events
2. **Exit Detection**: Monitors `UNPOSSESSED_ADMIN_CAMERA` events
3. **Session Tracking**: Records session duration and statistics
4. **Notification Sending**: Sends warnings and Discord notifications

### 2. Notification System
- **In-Game Warnings**: Admin chat messages to all online admins
- **Discord Notifications**: Rich embeds with role pings
- **Confirmation Messages**: Special messages to the admin who triggered the event
- **Batch Notifications**: Groups multiple events efficiently

### 3. Stealth Monitoring
- **Ignore List**: Players in ignore list don't trigger warnings for others
- **Steam ID Support**: Ignore by Steam ID
- **EOS ID Support**: Ignore by EOS ID
- **Stealth Notifications**: Ignored players get special stealth messages

### 4. Disconnect Handling
- **Event Detection**: Uses `PLAYER_DISCONNECTED` events
- **Timeout Cleanup**: Cleans up orphaned sessions after timeout
- **Reconnection**: Restores sessions if admins reconnect
- **Orphaned Session Tracking**: Monitors disconnected admin sessions

## 📊 Statistics Tracking

### Session Statistics
- **Total Sessions**: Number of admin camera sessions
- **Total Time**: Combined time spent in admin camera
- **Peak Users**: Maximum simultaneous admins in camera
- **Peak Time**: When peak usage occurred
- **First Entry**: Time of first admin camera entry
- **Last Exit**: Time of last admin camera exit

### Disconnect Tracking
- **Orphaned Sessions**: Sessions from disconnected admins
- **Disconnect Cleanups**: Number of cleanup operations
- **Active Timeouts**: Current disconnect timeouts
- **Orphaned Sessions**: Currently orphaned sessions

## 🕵️ Stealth Monitoring

### Ignore List Management
- **Steam ID Ignore**: Add/remove Steam IDs from ignore list
- **EOS ID Ignore**: Add/remove EOS IDs from ignore list
- **Real-time Management**: Add/remove IDs via admin commands
- **Persistent Storage**: Ignore list persists during server session

### Stealth Behavior
- **No Warnings**: Ignored players don't trigger warnings for other admins
- **Stealth Messages**: Ignored players get special stealth notifications
- **Session Tracking**: Ignored players' sessions are still tracked
- **Statistics**: Ignored players' data is included in statistics

## 🔄 UpdateManager Integration

This plugin is fully integrated with the UpdateManager system:

### Automatic Updates
- **Registration**: Automatically registers with UpdateManager on startup
- **Version Tracking**: Monitors GitHub releases for updates
- **Auto-Download**: Downloads and applies updates automatically
- **Backup Creation**: Creates backups before updating

### Update Information
- **Current Version**: v2.0.1
- **GitHub Repository**: SquadJS-admin-camera-warnings
- **Update Frequency**: Every 30 minutes (configurable)
- **Manual Updates**: Available via UpdateManagerPlugin commands

## 📁 File Structure

```
squad-server/
├── plugins/
│   ├── admin-camera-warnings.js    ← This plugin
│   ├── UpdateManagerPlugin.js      ← Optional Discord notifications
│   └── ...
├── utils/
│   └── update-manager.js           ← UpdateManager utility
└── BACKUP-Plugins/                 ← Automatic backups
    └── AdminCameraWarnings/
        └── admin-camera-warnings.js.backup
```

## 🚨 Important Notes

1. **Admin Permissions**: All commands require admin permissions
2. **Discord Optional**: Plugin works without Discord (in-game warnings only)
3. **UpdateManager Integration**: Requires UpdateManager for automatic updates
4. **Ignore List**: Stealth monitoring requires manual ID management
5. **Session Data**: Statistics are reset on new game/round

## 🐛 Troubleshooting

### Common Issues

**Discord notifications not working?**
- Check Discord channel ID and role ID are correct
- Verify Discord bot has permissions to send messages
- Check console logs for Discord connection errors
- Ensure `enableDiscordNotifications` is set to `true`

**In-game warnings not working?**
- Check `enableInGameWarnings` is set to `true`
- Verify admins have `canseeadminchat` permission
- Check console logs for permission errors

**Ignore list not working?**
- Ensure `enableIgnoreRole` is set to `true`
- Verify Steam/EOS IDs are correctly formatted
- Check console logs for ignore list errors

**Statistics not updating?**
- Check `enableSessionTracking` is set to `true`
- Verify admin camera events are being detected
- Check console logs for tracking errors

### Debug Commands

- **`!cameradebug`**: Show configuration and permission status
- **`!camerastats`**: Display current statistics and session data
- **`!cameratest`**: Test the warning system
- **Console Logs**: Check SquadJS console for detailed error messages

## 📊 Configuration Examples

### Minimal Setup (In-Game Only)
```json
{
  "plugin": "AdminCameraWarnings",
  "enabled": true,
  "enableDiscordNotifications": false
}
```

### Discord Integration
```json
{
  "plugin": "AdminCameraWarnings",
  "enabled": true,
  "discordClient": "discord",
  "channelID": "1411118066464460833",
  "adminRoleID": "1238951374558068820",
  "enableDiscordNotifications": true,
  "enableSessionTracking": true
}
```

### Stealth Monitoring Setup
```json
{
  "plugin": "AdminCameraWarnings",
  "enabled": true,
  "enableIgnoreRole": true,
  "ignoreRoleSteamIDs": ["76561198000000000", "76561198000000001"],
  "ignoreRoleEOSIDs": ["abc123def456", "def456ghi789"],
  "enableDiscordNotifications": true
}
```

### Full Production Setup
```json
{
  "plugin": "AdminCameraWarnings",
  "enabled": true,
  "discordClient": "discord",
  "channelID": "1411118066464460833",
  "adminRoleID": "1238951374558068820",
  "enableInGameWarnings": true,
  "enableDiscordNotifications": true,
  "enableSessionTracking": true,
  "enablePeakTracking": true,
  "enableDiscordSessionSummary": true,
  "notifyOnFirstEntry": true,
  "notifyOnLastExit": true,
  "warnOnlyAdminsInCamera": false,
  "enableIgnoreRole": true,
  "ignoreRoleSteamIDs": [],
  "ignoreRoleEOSIDs": [],
  "enableDisconnectTracking": true
}
```

## 🔗 Related Links

- **UpdateManager**: Automatic plugin update system
- **UpdateManagerPlugin**: Discord notifications for updates
- **BM-OverlayMonitor**: Integration for BM Overlay data
- **SquadJS Documentation**: Official SquadJS plugin development guide

## 📄 License

This plugin is part of the SquadJS ecosystem and follows the same licensing terms.

## 🤝 Contributing

Found a bug or have a feature request? Please open an issue or submit a pull request!

---

**Need automatic updates?** This plugin is integrated with the UpdateManager system for seamless updates!

