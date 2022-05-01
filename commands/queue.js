const { MessageEmbed } = require('discord.js');
const { Conditions } = require("../commandConditions.js");

const numSongsPerQueuePage = 10;

module.exports = 
{
	aliases : ["q"],
	description : "Displays the current queue. Use prev/next reactions to switch pages.",

	userPermissionsRequired: [],
	botPermissionsRequired: [],
	conditions :
	[
		Conditions.CONNECTION_IS_SET_UP,
	],

	async execute(message)
	{
		const serverId = message.guild.id;
		const serverQueue = message.discordClient.serverQueues.get(serverId);

		const numSongs = serverQueue.songs.length;
		if (numSongs === 0)
		{
			let embed = new MessageEmbed()
				.setTitle("The queue is currently empty.");
			message.channel.send({ embeds: [embed] });
			return;
		}
	
		// Get the page with the song being played currently
		const currentSongIndex = Math.min(Math.max(serverQueue.playingIndex, 0), numSongs - 1); // Bound to [0..numsongs - 1]
		const currentPageIndex = Math.floor(currentSongIndex / numSongsPerQueuePage);

		// Parse this page to a readable message
		let readablePage;
		try
		{
			readablePage = compileQueueToReadableMessage(serverQueue.songs, currentPageIndex, currentSongIndex);
		}
		catch(error)
		{
			let embed = new MessageEmbed()
				.setTitle(error);
			message.channel.send({ embeds: [embed] });
			return;
		}
	
		const numPages = Math.ceil(serverQueue.songs.length / numSongsPerQueuePage);
	
		// Send the message
		let embed = new MessageEmbed()
			.setTitle(`Current queue for #${message.channel.name}`)
			.setDescription(readablePage);
		embed.footer = 
		{
			text: `${currentPageIndex + 1}/${numPages}`,
		};
		
		message.channel.send({ embeds: [embed] })
			// Add reactions for page turning
			.then(sent => 
			{
				// If there's only 1 page, then we're done.
				if (numPages === 1)
				{
					return;
				}
				
				sent.react('⬅️').then(() => sent.react('➡️'));
			});
			
	},

	prevQueuePage(message)
	{
		const embed = message.embeds[0];

		let pageCounters = embed.footer.text.split("/");
		let currentPage = parseInt(pageCounters[0]) - 1;
		let numPages = parseInt(pageCounters[1]);

		--currentPage;
		if (currentPage < 0)
		{
			currentPage = numPages - 1;
		}

		switchQueuePage(message, currentPage);
	},

	nextQueuePage(message)
	{
		const embed = message.embeds[0];

		let pageCounters = embed.footer.text.split("/");
		let currentPage = parseInt(pageCounters[0]) - 1;
		let numPages = parseInt(pageCounters[1]);

		++currentPage;
		if (currentPage > numPages - 1)
		{
			currentPage = 0;
		}

		switchQueuePage(message, currentPage);
	},
};

// Parses the specified page to a readable format
function compileQueueToReadableMessage(songs, pageIndex, currentSongIndex)
{
	const numSongs = songs.length;
	const numPages = Math.ceil(numSongs / numSongsPerQueuePage);

	if (pageIndex < 0 || pageIndex >= numPages)
	{
		throw(`Error displaying queue: invalid page index`);
	}

	let queuedSongs = "";
	
	const startIndex = pageIndex * numSongsPerQueuePage;
	const endIndex = Math.min(startIndex + numSongsPerQueuePage - 1, numSongs - 1);

	for (let songIndex = startIndex; songIndex <= endIndex; ++songIndex)
	{
		const song = songs[songIndex];
		const bIsCurrentSong = (songIndex === currentSongIndex);

		// Highlight current song
		if (bIsCurrentSong)
		{
			queuedSongs += "**";
		}

		queuedSongs += (songIndex + 1).toString() + ". " + song.title + "\n";

		// End highlight current song
		if (bIsCurrentSong)
		{
			queuedSongs += "**";
		}
	}

	return queuedSongs;
}

// Switches the page on our previously sent queue message to the specified page index
function switchQueuePage(message, pageIndex)
{
	const serverId = message.guild.id;
	const serverQueue = message.discordClient.serverQueues.get(serverId);

	// Parse this page to a readable message
	let readablePage;
	try
	{
		readablePage = compileQueueToReadableMessage(serverQueue.songs, pageIndex, serverQueue.playingIndex);
	}
	catch(error)
	{
		let embed = new MessageEmbed()
			.setTitle(error);
		message.channel.send({ embeds: [embed] });
		return;
	}

	const numPages = Math.ceil(serverQueue.songs.length / numSongsPerQueuePage);

	let embed = new MessageEmbed()
		.setTitle(message.embeds[0].title)
		.setDescription(readablePage);
	embed.footer = 
	{
		text: `${pageIndex + 1}/${numPages}`,
	};

	message.edit({ embeds: [embed] });
}