const { Conditions } = require("../commandConditions.js");

module.exports = 
{
	aliases : [],
	description : "Clears the queue.",

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
		let serverQueue = message.discordClient.serverQueues.get(message.guild.id);
		let audioPlayer = serverQueue.audioPlayer;

		serverQueue.songs = [];
		serverQueue.playingIndex = -1;
		audioPlayer.stop();
		
		message.react('👌');
	},
};
