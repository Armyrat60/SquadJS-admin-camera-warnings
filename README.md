# Admin Camera Warnings Plugin - Enhanced Edition

## Overview

The `AdminCameraWarnings` plugin provides comprehensive monitoring and notification systems for admin camera usage in Squad servers. This enhanced version includes new features for disconnect tracking, stealth monitoring, and flexible notification targeting.

## New Features in v1.0.1

### 🕵️ **Stealth Mode (Ignore Role)**
- **Purpose**: Allow certain admins to monitor without alerting others
- **Use Cases**: 
  - Senior admins who want to observe without disruption
  - Investigative monitoring
  - Training sessions where you don't want to spam other admins
- **Configuration**: Add Steam IDs or EOS IDs to the ignore list

### 📡 **Disconnect Tracking**
- **Problem Solved**: Admins disconnecting/crashing/Alt+F4ing while in admin camera
- **Solution**: Automatic cleanup of orphaned sessions after configurable timeout
- **Benefits**: 
  - Accurate session tracking
  - Prevents false "still in camera" states
  - Discord notifications for orphaned sessions

### 🎯 **Flexible Warning Scope**
- **Option 1**: Warn all online admins (original behavior)
- **Option 2**: Warn only admins currently in admin camera
- **Use Cases**: 
  - Reduce notification spam
  - Focus warnings on relevant admins
  - Customize based on server needs

## Configuration Options

### Basic Settings
```json
{
  "AdminCameraWarnings": {
    "enabled": true,
    "channelID": "YOUR_DISCORD_CHANNEL_ID",
    "adminRoleID": "YOUR_DISCORD_ADMIN_ROLE_ID"
  }
}
```

### New Feature Settings

#### Stealth Mode
```json
{
  "enableIgnoreRole": true,
  "ignoreRoleSteamIDs": ["76561198012345678"],
  "ignoreRoleEOSIDs": ["00000000000000000000000000000001"]
}
```

#### Disconnect Tracking
```json
{
  "enableDisconnectTracking": true,
  "disconnectTimeoutSeconds": 60
}
```

#### Warning Scope
```json
{
  "warnOnlyAdminsInCamera": false
}
```

## Commands

### New Commands

#### `!cameraignore`
Manage the ignore role list for stealth monitoring.

**Usage:**
- `!cameraignore` - Show current ignore role status
- `!cameraignore add steam 76561198012345678` - Add Steam ID to ignore list
- `!cameraignore add eos 00000000000000000000000000000001` - Add EOS ID to ignore list
- `!cameraignore remove steam 76561198012345678` - Remove Steam ID from ignore list
- `!cameraignore remove eos 00000000000000000000000000000001` - Remove EOS ID from ignore list

### Enhanced Commands

#### `!camerastats`
Now includes disconnect tracking statistics:
- Orphaned sessions count
- Disconnect cleanup count
- Current timeout count
- Orphaned sessions count

#### `!cameradebug`
Now shows new feature status:
- Warning scope configuration
- Ignore role status
- Disconnect tracking status
- Timeout configuration

## How It Works

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

### Warning Scope Flow
1. **warnOnlyAdminsInCamera: false** → All online admins get warnings
2. **warnOnlyAdminsInCamera: true** → Only admins in camera get warnings

## Use Cases

### Server Administration
- **Large admin teams**: Use stealth mode to reduce notification spam
- **Training sessions**: Senior admins can observe without disruption
- **Investigation**: Monitor suspicious activity without alerting targets

### Session Management
- **Crash recovery**: Automatic cleanup of orphaned sessions
- **Accurate tracking**: Real-time session status without false positives
- **Statistics**: Comprehensive reporting including disconnect events

### Notification Control
- **Reduced spam**: Target warnings only to relevant admins
- **Flexible scope**: Choose between broad and focused notifications
- **Stealth operations**: Monitor without detection

## Configuration Examples

### Minimal Configuration
```json
{
  "AdminCameraWarnings": {
    "enabled": true,
    "channelID": "1234567890123456789"
  }
}
```

### Full Feature Configuration
```json
{
  "AdminCameraWarnings": {
    "enabled": true,
    "channelID": "1234567890123456789",
    "adminRoleID": "1234567890123456789",
    "enableIgnoreRole": true,
    "ignoreRoleSteamIDs": ["76561198012345678"],
    "enableDisconnectTracking": true,
    "disconnectTimeoutSeconds": 60,
    "warnOnlyAdminsInCamera": true,
    "enableInGameWarnings": true,
    "enableDiscordNotifications": true
  }
}
```

### Stealth Monitoring Setup
```json
{
  "AdminCameraWarnings": {
    "enabled": true,
    "channelID": "1234567890123456789",
    "enableIgnoreRole": true,
    "ignoreRoleSteamIDs": ["76561198012345678", "76561198087654321"],
    "warnOnlyAdminsInCamera": true,
    "enableDiscordNotifications": false
  }
}
```

## Troubleshooting

### Common Issues

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

### Debug Commands
- `!cameradebug` - Show all configuration and status
- `!camerastats` - Show detailed statistics
- `!cameraignore` - Manage ignore role list

## Migration from v1.x

### Breaking Changes
- None - all new features are opt-in

### New Configuration Options
- Add new options as needed
- Existing configurations continue to work unchanged

### Recommended Upgrades
1. Enable disconnect tracking for better session management
2. Consider using ignore role for senior admins
3. Evaluate warning scope based on server size

## Support

For issues or questions:
1. Check the debug commands (`!cameradebug`, `!camerastats`)
2. Review configuration examples
3. Check SquadJS logs for verbose output
4. Ensure all required permissions are set correctly

## Version History

### v2.0.0
- Added stealth mode (ignore role)
- Added disconnect tracking
- Added flexible warning scope
- Enhanced statistics and debugging
- New management commands

### v1.x
- Basic admin camera notifications
- Discord integration
- Session tracking
- Cooldown system
