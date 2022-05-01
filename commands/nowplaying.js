const { MessageEmbed } = require('discord.js');
const { Conditions } = require("../commandConditions.js");

module.exports = 
{
	aliases : ["np"],
	description : "Displays the currently playing song.",

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
		const serverQueue = message.discordClient.serverQueues.get(message.guild.id);
		
		// Check if any song is currently playing (resouce is valid)
		if (!serverQueue.audioPlayer.state.resource)
		{
			const embed = new MessageEmbed()
				.setTitle("No song is currently playing.");
			message.channel.send({ embeds: [embed] });
			return;
		}

		const song = serverQueue.audioPlayer.state.resource.metadata;
		const embed = new MessageEmbed()
			.setTitle("Now playing")
			.setDescription(`**[${song.title}](${song.url})** [<@${song.addedBy}>]\n`);

		const currentPlayTime = serverQueue.audioPlayer.state.resource.playbackDuration;

		// Convert to minutes and seconds
		const currentPlayMinutes = Math.floor(currentPlayTime / 60000);
		const currentPlaySeconds = ((currentPlayTime % 60000) / 1000).toFixed(0);
		const currentPlayTimeStr = currentPlayMinutes + ":" + (currentPlaySeconds < 10 ? '0' : '') + currentPlaySeconds;
		
		
		embed.footer = 
		{
			text: currentPlayTimeStr,
		};

		message.channel.send({ embeds: [embed] });
	},
};
