# AdminCameraWarnings Plugin

## Description

The `AdminCameraWarnings` plugin provides comprehensive in-game notifications and Discord alerts when admins enter/leave admin camera, with enhanced tracking features and automatic updates via the SquadJS AutoUpdater system. This v2.0.0 enhanced version includes new features for disconnect tracking, stealth monitoring, flexible notification targeting, and simplified configuration for better consistency.

## Features

### Core Functionality
- **Admin Camera Tracking** - Monitors when admins enter/leave admin camera
- **In-Game Warnings** - Sends warnings to admins about camera usage
- **Session Duration** - Tracks how long admins stay in camera
- **Active Admin Count** - Shows how many admins are currently in camera

### Enhanced Features
- **Session Statistics** - Tracks total sessions, time, and peak usage
- **Peak Tracking** - Monitors maximum concurrent admin camera users
- **First/Last Entry Notifications** - Special alerts for camera activation/deactivation
- **Automatic Confirmation Messages** - Sends personalized messages to the admin who triggered events

### New Features (v2.0.0)
- **Stealth Mode (Ignore Role)** - Allow certain admins to monitor without alerting others
- **Disconnect Tracking** - Automatically clean up orphaned admin camera sessions (no timeout needed)
- **Flexible Warning Scope** - Choose between warning all admins or only those in camera
- **Enhanced Statistics** - Track orphaned sessions and disconnect cleanups
- **Simplified Configuration** - Removed unnecessary customization options for better consistency
- **Hardcoded Messages** - Standard professional messages and colors
- **Automatic Behavior** - No more manual timeout or cooldown settings
- **Stealth Mode Feedback** - Players on ignore list get notified that they're in stealth mode

### Discord Integration
- **Real-time Notifications** - Instant Discord alerts for camera events
- **Rich Embeds** - Color-coded notifications with detailed information
- **Role Pinging** - Configurable admin role mentions
- **Session Summaries** - Round-end summaries of camera usage statistics

### Auto-Update System
- **Automatic Updates** - Checks for updates every 30 minutes
- **GitHub Integration** - Downloads updates from official repository
- **Backup System** - Creates organized backups before updates
- **Version Tracking** - Maintains update history and current version
- **Discord Notifications** - Alerts admins when updates are available

## Installation

### Basic Installation
1. Copy `admin-camera-warnings.js` to your `squad-server/plugins/` folder
2. Add the configuration below to your `config.json`
3. Ensure you have RCON and Discord connections configured
4. Restart SquadJS

### Auto-Update Setup
1. Ensure `AutoUpdatePlugin.js` is enabled in your SquadJS configuration
2. Configure Discord webhook for update notifications
3. Plugin will automatically check for updates every 30 minutes
4. Updates are downloaded and applied automatically
5. Discord notifications sent for update events

## Configuration

Copy and paste this configuration into your `config.json`:

```json
{
  "plugin": "AdminCameraWarnings",
  "enabled": true,
  "discordClient": "discord",
  "channelID": "your-discord-channel-id",
  "adminRoleID": "your-admin-role-id",
  
  "enableInGameWarnings": true,
  "enableDiscordNotifications": true,
  
  "warnOnlyAdminsInCamera": false,
  
  "enableIgnoreRole": true,
  "ignoreRoleSteamIDs": ["76561198012345678"],
  "ignoreRoleEOSIDs": ["00000000000000000000000000000001"],
  
  "enableDisconnectTracking": true,
  
  "enableSessionTracking": true,
  "enablePeakTracking": true,
  "enableDiscordSessionSummary": false,
  
  "notifyOnFirstEntry": true,
  "notifyOnLastExit": true
}
```

## Configuration Definitions

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `plugin` | string | `"AdminCameraWarnings"` | Plugin name (required) |
| `enabled` | boolean | `true` | Enable/disable the plugin |
| `discordClient` | string | `"discord"` | Discord connector name to use for notifications |
| `channelID` | string | `"default"` | Discord channel ID for notifications |
| `adminRoleID` | string | `"default"` | Discord role ID to ping for alerts |
| `enableInGameWarnings` | boolean | `true` | Send in-game warnings when admins enter/leave camera |
| `enableDiscordNotifications` | boolean | `true` | Send Discord notifications for admin camera events |
| `warnOnlyAdminsInCamera` | boolean | `false` | Only warn admins who are currently in admin camera (instead of all online admins) |
| `enableIgnoreRole` | boolean | `false` | Enable ignore role to prevent certain players from triggering warnings |
| `ignoreRoleSteamIDs` | array | `[]` | Array of Steam IDs to ignore (won't trigger warnings for other admins) |
| `ignoreRoleEOSIDs` | array | `[]` | Array of EOS IDs to ignore (won't trigger warnings for other admins) |
| `enableDisconnectTracking` | boolean | `true` | Automatically track admin disconnects and clean up orphaned sessions |
| `enableSessionTracking` | boolean | `true` | Track admin camera sessions for statistics |
| `enablePeakTracking` | boolean | `true` | Track peak admin camera usage |
| `enableDiscordSessionSummary` | boolean | `false` | Send Discord summary of admin camera sessions |
| `notifyOnFirstEntry` | boolean | `true` | Send special notification when first admin enters camera |
| `notifyOnLastExit` | boolean | `true` | Send special notification when last admin exits camera |

## Message Variables
- `{admin}` - Name of the admin entering/leaving camera
- `{count}` - Number of admins currently in camera
- `{duration}` - Duration of the camera session (leave messages only)

**Note**: All messages are now hardcoded with standard formatting and colors for consistency.

## Commands

| Command | Description | Admin Only | Usage |
|---------|-------------|------------|-------|
| `!cameratest` | Test admin camera warning functionality | Yes | `!cameratest` |
| `!camerastats` | Show admin camera statistics and active sessions | Yes | `!camerastats` |
| `!cameradebug` | Show admin camera system status and configuration | Yes | `!cameradebug` |
| `!cameraupdate` | Manually check for plugin updates | Yes | `!cameraupdate` |
| `!cameraignore` | Manage ignore role list for stealth monitoring | Yes | `!cameraignore [add/remove] [steam/eos] [ID]` |

### Command Examples

#### `!cameraignore` Usage
- `!cameraignore` - Show current ignore role status
- `!cameraignore add steam 76561198012345678` - Add Steam ID to ignore list
- `!cameraignore add eos 00000000000000000000000000000001` - Add EOS ID to ignore list
- `!cameraignore remove steam 76561198012345678` - Remove Steam ID from ignore list
- `!cameraignore remove eos 00000000000000000000000000000001` - Remove EOS ID from ignore list

## Use Cases

### Server Administration
- **Large admin teams**: Use stealth mode to reduce notification spam
- **Training sessions**: Senior admins can observe without disruption
- **Investigation**: Monitor suspicious activity without alerting targets
- **Session management**: Track admin camera usage and duration
- **Stealth feedback**: Players on ignore list know they're in stealth mode

### Session Management
- **Crash recovery**: Automatic cleanup of orphaned sessions
- **Accurate tracking**: Real-time session status without false positives
- **Statistics**: Comprehensive reporting including disconnect events
- **Peak monitoring**: Track maximum concurrent admin camera users

### Notification Control
- **Reduced spam**: Target warnings only to relevant admins
- **Flexible scope**: Choose between broad and focused notifications
- **Stealth operations**: Monitor without detection
- **Cooldown protection**: Prevent notification spam from same admin

## How It Works

### Admin Camera Events
1. **Admin enters camera** → Plugin detects the `POSSESSED_ADMIN_CAMERA` event
2. **Session tracking** → Plugin creates session data and tracks duration
3. **In-game warnings** → Admins notified via RCON with customizable messages
4. **Discord notifications** → Rich embeds sent to configured Discord channel
5. **Statistics update** → Peak usage and session data updated
6. **Admin leaves camera** → Plugin detects the `UNPOSSESSED_ADMIN_CAMERA` event
7. **Session completion** → Duration calculated and final notifications sent

### Disconnect Tracking Flow
1. **Admin enters admin camera** → Session starts
2. **Admin disconnects** → Timeout timer starts
3. **Timeout expires** → Session marked as orphaned, cleanup occurs
4. **Discord notification** → Sent about orphaned session
5. **Statistics updated** → Orphaned session count incremented

### Stealth Mode Flow
1. **Admin in ignore list enters camera** → No notifications sent
2. **Other admins enter/leave camera** → Normal notifications sent
3. **Ignore list admin actions** → Completely silent to other admins

### Session Management
- **Active Sessions** - Real-time tracking of currently active admin camera users
- **Session History** - Complete record of all sessions for current match
- **Statistics** - Total sessions, time, peak users, and timing information
- **Round Reset** - All tracking resets when new game starts

## Troubleshooting

### Common Issues

#### Warnings Not Working
- Check `enableInGameWarnings` setting and RCON connection
- Verify admin permissions and RCON connection
- Ensure admin camera events are being tracked by SquadJS

#### Discord Not Working
- Verify Discord connector and channel ID configuration
- Check if `enableDiscordNotifications` is set to `true`
- Ensure Discord bot has permissions to send messages

#### Commands Not Working
- Check admin permissions and RCON connection
- Verify command syntax and parameters
- Use `!cameradebug` to check system status

#### Admins Still Getting Notifications When They Shouldn't
- Check if `enableIgnoreRole` is set to `true`
- Verify Steam IDs and EOS IDs are correct
- Use `!cameraignore` command to check current status

#### Sessions Not Being Cleaned Up
- Ensure `enableDisconnectTracking` is `true`
- Check `disconnectTimeoutSeconds` value
- Look for Discord notifications about orphaned sessions

#### Too Many Notifications
- Set `warnOnlyAdminsInCamera` to `true`
- Use ignore role for admins who don't need notifications
- Adjust cooldown settings

#### Auto-updates Failing
- Check GitHub repository access and AutoUpdatePlugin configuration
- Verify network connectivity to GitHub
- Check SquadJS logs for update errors

### Debug Commands
- Use `!cameradebug` to check system status and configuration
- Use `!camerastats` to view current session statistics
- Use `!cameraupdate` to manually trigger update checks
- Use `!cameraignore` to manage ignore role list

### Logs
- Enable verbose logging in SquadJS configuration
- Check for AutoUpdater initialization messages
- Monitor Discord notification delivery
- Verify RCON command execution

## Support

For issues, feature requests, or contributions:
- **GitHub Repository**: [SquadJS-admin-camera-warnings](https://github.com/Armyrat60/SquadJS-admin-camera-warnings)
- **SquadJS Community**: Join the SquadJS Discord for support
- **Documentation**: This README and SquadJS documentation

### Getting Help
1. Check the debug commands (`!cameradebug`, `!camerastats`)
2. Review configuration examples
3. Check SquadJS logs for verbose output
4. Ensure all required permissions are set correctly
5. Verify RCON and Discord connections are working

## Version History

### v2.0.0 (Current)
- **Stealth Mode (Ignore Role)** - Allow certain admins to monitor without alerting others
- **Disconnect Tracking** - Automatically clean up orphaned admin camera sessions (no timeout needed)
- **Flexible Warning Scope** - Choose between warning all admins or only those in camera
- **Enhanced Statistics** - Track orphaned sessions and disconnect cleanups
- **New Management Commands** - `!cameraignore` command for managing ignore role list
- **Simplified Configuration** - Removed unnecessary customization options for better consistency
- **Hardcoded Messages** - Standard professional messages and colors
- **Automatic Behavior** - No more manual timeout or cooldown settings

### v1.0.0
- **Basic Functionality** - Core admin camera monitoring
- **In-Game Warnings** - RCON-based notifications
- **Session Tracking** - Basic duration monitoring
- **Discord Integration** - Rich embed notifications
- **Cooldown System** - Prevent notification spam
- **Auto-Update System** - Automatic updates via GitHub
- **Session Statistics** - Comprehensive tracking and reporting 
