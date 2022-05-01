const { MessageEmbed } = require('discord.js');
const { Conditions } = require("../commandConditions.js");
const { getSongsInfo } = require("../ytdlToolkit.js");

module.exports = 
{
	aliases : ["p"],
	description : "Plays a song or a playlist. Usage: \"play [title/URL]\". Pause/unpause the queue if used without the extra input.",

	userPermissionsRequired: [],
	botPermissionsRequired: ["CONNECT", "SPEAK"],
	botMissingPermsMessage: "Lord please granteth me the permission to joineth and speaketh in thy holy voice channels.",
	conditions :
	[ 
		Conditions.AUTHOR_IN_VOICE_CHANNEL,
		Conditions.BOT_IS_FREE,
	],

	async execute(message)
	{
		const discordClient = message.discordClient;
		const args = message.args;

		// Function definition
		async function queueSongs(songs)
		{
			// Set the requester to send with the "playing" message later
			for (let song of songs)
			{
				song.addedBy = message.author.id;
			}

			// BEGIN CRITICAL REGION: serverQueue is valid but audioPlayer might not be. Do not queue any command that has serverQueueExists condition in here.
			const serverQueue = discordClient.Toolkit.getOrAddServerQueue(message);

			// Add the songs
			const indexAdded = serverQueue.songs.length; // the added songs start from this index
			serverQueue.songs.push.apply(serverQueue.songs, songs);

			// Request voice connection and audio player if haven't already existed.
			discordClient.Toolkit.requestServerConnection(message.member.voice.channel);
			// END CRITICAL REGION: both serverQueue and audioPlayer should be valid now.

			// Send "queued" messages if we aren't gonna play the added song right away (audioPlayer already has resource to play).
			const bQueueIsIdle = !serverQueue.audioPlayer.state.resource;

			if (songs.length === 1)
			{
				if (!bQueueIsIdle) 
				{
					let embed = new MessageEmbed()
						.setTitle(`Queued ${songs[0].title}.`);

					message.channel.send({ embeds: [embed] });
				}
			}
			else
			{
				let embed = new MessageEmbed()
					.setTitle(`Queued ${songs.length} songs`);
				message.channel.send({ embeds: [embed] });
			}

			// Play the first of the newly added song if queue is idle
			if (bQueueIsIdle)
			{
				discordClient.Toolkit.tryPlayNextSong(message.guild.id);
			}
		}

		const bIsFromPlaylist = args.bIsFromPlaylist ? // this can be null 
			args.bIsFromPlaylist : false;

		if (bIsFromPlaylist)
		{
			const songs = args.songs;
			queueSongs(songs);
		}
		else
		{
			let contentToPlay = args.extraArgs;

			// Remove embed symbols
			contentToPlay = contentToPlay.replace(/[<>]/g, '');
			if (contentToPlay === "")
			{
				const pauseCommand = require("./pause.js");
				discordClient.Toolkit.executeCommand(message, pauseCommand);
				return;
			}

			// Resolve the requested content into a list of songs (name + URL) to add
			getSongsInfo(message, contentToPlay).then(songs => 
			{
				// Return if we couldn't find any song matching the requested content.
				// No need to send anything here because getSongsInfo already has error checking.
				if (songs.length === 0)
				{
					return;
				}
	
				queueSongs(songs);
			});
		}
	},
};
