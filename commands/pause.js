const { AudioPlayerStatus  } = require('@discordjs/voice');
const { Conditions } = require("../commandConditions.js");

module.exports = 
{
	aliases : [],
	description : "Pauses/unpauses the queue.",

	userPermissionsRequired: [],
	botPermissionsRequired: [],
	conditions : 
	[
		Conditions.AUTHOR_IN_VOICE_CHANNEL,
		Conditions.CONNECTION_IS_SET_UP,
	],

	async execute(message) 
	{
		const serverId = message.guild.id;
		const audioPlayer = message.discordClient.Toolkit.getServerAudioPlayer(serverId);
		
		// No need to null-check "audioPlayer" since the condition already ensures that this is valid
		switch (audioPlayer.state.status)
		{
			case AudioPlayerStatus.Playing:
				audioPlayer.pause();
				message.react(`👌`);
				break;

			case AudioPlayerStatus.Paused:
				audioPlayer.unpause();
				message.react(`👌`);
				break;

			default:
				break;
		}

	},
};
