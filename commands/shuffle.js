const { Conditions } = require("../commandConditions.js");

module.exports = 
{
	aliases : [],
	description : "Shuffles the queue. Optional: [all]. By default this will only affect the songs after the current one.",

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
		const serverId = message.guild.id;
		const serverQueue = message.discordClient.serverQueues.get(serverId);
		const option = message.args.extraArgs;

		// Error checking
		if (serverQueue.playingIndex < 0 || serverQueue.playingIndex >= serverQueue.songs.length)
		{
			console.error(`shuffle - ran into unexpected index ${serverQueue.playingIndex}`);
			console.error(serverQueue.songs);
			throw("");
		}

		const bIsShuffleAll = (option === "all");
		const shuffleLimit = bIsShuffleAll ? 0 : serverQueue.playingIndex;

		// Walk the queue backwards and swap each song with a random lower one. 
		// Don't shuffle the current song. Don't go all the way to the first song (since it can't swap with anything)
		for (let i = serverQueue.songs.length - 1; i > shuffleLimit; i--)
		{
			if (i === serverQueue.playingIndex)
			{
				continue;
			}

			// This will roll a number between 0-i, since random rolls a number from 0-1 (not including 1)
			// There is a chance for it not to change positions, which is probably fine.
			var j = getRandomInRange(shuffleLimit, i);
			while (j === serverQueue.playingIndex) // Reroll if this lands on the current song
			{
				j = getRandomInRange(shuffleLimit, i);
			}

			[serverQueue.songs[i], serverQueue.songs[j]] = [serverQueue.songs[j], serverQueue.songs[i]];
		}

		// Put the current song as the first song if this is a full shuffle
		if (bIsShuffleAll && serverQueue.playingIndex != 0)
		{
			const song = serverQueue.songs[serverQueue.playingIndex];
			serverQueue.songs.splice(serverQueue.playingIndex, 1);
			serverQueue.songs.unshift(song);
			serverQueue.playingIndex = 0;

			if (message.discordClient.Toolkit.isQueueIdleInServer(serverId))
			{
				message.discordClient.Toolkit.tryPlaySongAtIndex(serverId, 0);
			}
		}

		message.react('👌');
	},
};

// Returns an integer between min and max (both inclusive)
function getRandomInRange(min, max) 
{
    return Math.floor(Math.random() * (max - min + 1) + min);
}