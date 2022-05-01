const { Conditions } = require("../commandConditions.js");
const { MessageEmbed } = require('discord.js');

module.exports = 
{
	aliases : ["rm"],
	description : "Removes a song by its number in the queue.",

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

		// Parse argument to index
		const inputIndex = parseInt(message.args.extraArgs);
		if (isNaN(inputIndex) || inputIndex - 1 < 0 || inputIndex - 1 >= serverQueue.songs.length)
		{
			let embed = new MessageEmbed()
				.setTitle(`Please enter a valid index. Usage: remove [number in queue].`);
				message.channel.send({ embeds: [embed] });
			return;
		}

		// Remove from queue
		const indexToRemove = inputIndex - 1;
		const songToRemove = serverQueue.songs[indexToRemove];
		serverQueue.songs.splice(indexToRemove, 1);

		let currentSongIndex = serverQueue.playingIndex;

		// If the removed song is lower than the playing index, bump the index down not to skip a song
		if (serverQueue.playingIndex >= indexToRemove)
		{
			--serverQueue.playingIndex;
		}

		// If we removed the current song, stop the audio player.
		// The next song will automatically be queued if it exists
		if (currentSongIndex === indexToRemove)
		{
			serverQueue.audioPlayer.stop();
		}

		const removeStr = "Removed " + inputIndex.toString() + ". " + songToRemove.title + "\n" ;
		const embed = new MessageEmbed()
			.setTitle(removeStr);
		message.channel.send({ embeds: [embed] });
	},
};
