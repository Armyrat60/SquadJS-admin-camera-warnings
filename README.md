# SquadJS Admin Camera Warnings Plugin

A comprehensive SquadJS plugin that provides in-game notifications and Discord alerts when admins enter/leave admin camera, with configurable messages, cooldowns, and enhanced tracking features.

## Features

- **In-Game Warnings**: Notify admins when someone enters/leaves admin camera
- **Discord Integration**: Send Discord notifications with customizable embeds
- **Session Tracking**: Monitor admin camera usage and generate statistics
- **Cooldown System**: Prevent spam notifications with configurable cooldowns
- **Message Customization**: Fully customizable notification messages
- **Auto-Update System**: Automatically updates from GitHub releases
- **Statistics**: Track peak usage, total sessions, and session durations

## Installation

1. Download the `admin-camera-warnings.js` file
2. Place it in your `squad-server/plugins/` directory
3. Add the plugin to your `config.json`
4. Restart SquadJS

## Configuration

```json
{
  "AdminCameraWarnings": {
    "channelID": "YOUR_DISCORD_CHANNEL_ID",
    "adminRoleID": "YOUR_DISCORD_ADMIN_ROLE_ID",
    "enableInGameWarnings": true,
    "enableDiscordNotifications": true,
    "enableCooldown": true,
    "cooldownSeconds": 30,
    "enableSessionTracking": true,
    "enablePeakTracking": true,
    "enableDiscordSessionSummary": false
  }
}
```

## Auto-Update System

This plugin includes an automatic update system that:
- Checks for updates every 30 minutes
- Downloads new versions from GitHub releases
- Creates backups before updating
- Requires a SquadJS restart to apply updates

**Note**: The auto-update system is hardcoded to use the official repository and cannot be modified by users.

## Commands

- `!cameratest` - Test the admin camera warning system
- `!camerastats` - View current admin camera statistics
- `!cameradebug` - Debug plugin configuration and permissions

## Message Customization

All notification messages support placeholders:
- `{admin}` - Name of the admin who triggered the event
- `{count}` - Number of currently active admins
- `{duration}` - Duration of the admin camera session

## Discord Integration

The plugin sends rich Discord embeds with:
- Color-coded notifications (red for enter, green for leave)
- Timestamps and server information
- Role pings for admin alerts
- Session summaries and statistics

## Session Tracking

Tracks detailed information about admin camera usage:
- Session start/end times
- Duration tracking
- Peak concurrent users
- Total session statistics
- Round-based session summaries

## Requirements

- SquadJS v3.0.0 or higher
- Discord bot token (for Discord notifications)
- Admin permissions for in-game commands

## Support

For issues, feature requests, or questions:
- Create an issue on GitHub
- Check the SquadJS documentation
- Review the plugin configuration options

## License

This plugin is provided as-is for use with SquadJS servers.

## Version History

- **v1.0.0** - Initial release with core functionality
- Auto-update system included for seamless updates

## Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

---

**Note**: This plugin automatically updates itself from the official repository. Please restart SquadJS after updates are applied.
