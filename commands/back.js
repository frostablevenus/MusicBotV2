const { Conditions } = require("../commandConditions.js");

module.exports = 
{
	aliases : ["b", "prev"],
	description : "Skips to the previous song.",

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
		message.discordClient.Toolkit.tryPlayPrevSong(message.guild.id);
	},
};
