const { Conditions } = require("../commandConditions.js");

module.exports = 
{
	aliases : ["n"],
	description : "Skips to the next song.",

	userPermissionsRequired: [],
	botPermissionsRequired: [],
	conditions : 
	[
		Conditions.AUTHOR_IN_VOICE_CHANNEL,
		Conditions.CONNECTION_IS_SET_UP,
		Conditions.HAS_SONG_IN_QUEUE,
	],

	async execute(message) 
	{
		message.discordClient.Toolkit.tryPlayNextSong(message.guild.id);
	},
};
