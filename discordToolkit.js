// Functions that are added to a Discord client to expand its functionalities.

const { MessageEmbed } = require('discord.js');
const { getVoiceConnection, joinVoiceChannel, AudioPlayerStatus, createAudioPlayer, createAudioResource, demuxProbe } = require('@discordjs/voice');
const { bindVoiceConnectionEvents } = require("./eventHandlersDiscord.js"); 

const ytdl = require('ytdl-core');
const playdl = require('play-dl');
const fluentFfmpeg = require('fluent-ffmpeg');

const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
fluentFfmpeg.setFfmpegPath(ffmpegPath);

// Server queue follows this structure:
// {
//		serverId,
// 		defaultTextChannel, // to automatically send errors when not responding to a specific user message.
// 		audioPlayer,
// 		songs: [],
// 		playingIndex,
// 		looping,
// }

module.exports = 
{
	discordClient : null,

	checkCondition(message, conditionName)
	{
		const condition = this.discordClient.conditions.get(conditionName);

		if (!condition.check(message))
		{
			let embed = new MessageEmbed()
				.setTitle(condition.failureMessage);
			message.channel.send({ embeds: [embed] });
			return false;
		}

		return true;
	},

	async executeCommand(message, command)
	{
		// Permission check
		if (!message.member.permissions.has(command.userPermissionsRequired, true)) // true = admin overrides
		{
			let embed = new MessageEmbed()
				.setTitle(`You do not have permission to run this command.`);
			message.channel.send({ embeds: [embed] });
			return;
		}

		if (!message.guild.me.permissions.has(command.botPermissionsRequired, true))
		{
			let embed = new MessageEmbed()
				.setTitle(command.botMissingPermsMessage === null ? 
					`I do not have permission to run this command.` : command.botMissingPermsMessage);
			message.channel.send({ embeds: [embed] });
			return;
		}

		// Condition check
		for (let conditionName of command.conditions)
		{
			const condition = message.discordClient.conditions.get(conditionName);

			if (!condition.check(message))
			{
				let embed = new MessageEmbed()
					.setTitle(condition.failureMessage);
				message.channel.send({ embeds: [embed] });
				return;
			}
		}

		try 
		{
			await command.execute(message);
		} 
		catch (error) 
		{
			let embed = new MessageEmbed()
				.setTitle(`There was an error while executing this command.`);
			console.error(error);
			message.channel.send({ embeds: [embed] });
		}
	},

	getOrAddServerQueue(message)
	{
		const serverId = message.guild.id;
		const textChannel = message.channel;

		let serverQueues = this.discordClient.serverQueues;

		if (serverQueues.has(serverId))
		{
			return serverQueues.get(serverId);
		}
		else
		{
			const newServerQueue = 
			{
				serverId: serverId,
				defaultTextChannel: textChannel, // to automatically send errors when not responding to a specific user message.
				audioPlayer: null,
				songs: [],
				// volume: 5,
				playingIndex: -1,
				looping: false,
			}

			serverQueues.set(serverId, newServerQueue);
			return newServerQueue;
		}
	},

	getServerAudioPlayer(serverId)
	{
		const serverQueue = this.discordClient.serverQueues.get(serverId);
		if (!serverQueue)
		{
			return undefined;
		}

		return serverQueue.audioPlayer;
	},

	setServerAudioPlayer(serverId, audioPlayer)
	{
		let serverQueue = this.discordClient.serverQueues.get(serverId);
		if (!serverQueue)
		{
			console.error("setServerAudioPlayer called with a server not in our local database.");
			return;
		}

		serverQueue.audioPlayer = audioPlayer;
	},

	isConnectionSetUp(serverId)
	{
		const serverQueue = this.discordClient.serverQueues.get(serverId);
		const connection = getVoiceConnection(serverId);

		return connection && serverQueue && serverQueue.audioPlayer;
	},

	requestServerConnection(voiceChannel)
	{
		const serverId = voiceChannel.guild.id;
		let serverQueue = this.discordClient.serverQueues.get(serverId);

		let bNewConnection, bNewAudioPlayer = false;
		
		// Make a new connection if necessary
		let connection = getVoiceConnection(serverId);
		if (!connection)
		{
			connection = requestVoiceConnection(voiceChannel);
			bindVoiceConnectionEvents(connection, this.discordClient, serverId);
			bNewConnection = true;

			if (!connection)
			{
				throw("DiscordAPI Error: Couldn't connect to voice channel.");
			}
		}
	
		// Make a new audio player if necessary
		let audioPlayer = this.getServerAudioPlayer(serverId);
		if (!audioPlayer)
		{
			audioPlayer = requestAudioPlayer(voiceChannel);
			bNewAudioPlayer = true;
			
			if (!audioPlayer)
			{
				throw("DiscordAPI Error: Couldn't create an audio player.");
			}
		}

		// Subscribe the connection to the audioplayer if either is new
		if (bNewConnection || bNewAudioPlayer)
		{
			connection.subscribe(audioPlayer);
		}
	},

	cleanUpServerConnection(serverId)
	{
		const serverQueue = this.discordClient.serverQueues.get(serverId);
		if (serverQueue)
		{
			if (serverQueue.audioPlayer)
			{
				serverQueue.audioPlayer.bIsCleaningUp = true;
				serverQueue.audioPlayer.stop();
				serverQueue.audioPlayer = null;
			}

			let connection = getVoiceConnection(serverId);
			if (connection)
			{
				connection.destroy();
				connection = null;
			}

			let embed = new MessageEmbed()
				.setTitle(`Queue purged from leaving or failing to reconnect.`);
			serverQueue.defaultTextChannel.send({ embeds: [embed] });

			this.discordClient.serverQueues.delete(serverId);
		}
	},

	isQueueIdleInServer(serverId)
	{
		const serverQueue = this.discordClient.serverQueues.get(serverId);
		return !serverQueue || !serverQueue.audioPlayer || serverQueue.audioPlayer.state.status === AudioPlayerStatus.Idle;
	},

	hasSongInQueueInServer(serverId)
	{
		const serverQueue = this.discordClient.serverQueues.get(serverId);
		return serverQueue && serverQueue.songs.length > 0;
	},

	
	////////////////////////////////////////////////////////////////////////
	// tryPlay... functions. Their purpose is mainly to do arithmetic on the 
	// index and check for wrapping, and call playSongAtIndex.  
	////////////////////////////////////////////////////////////////////////
	tryPlayNextSong(serverId)
	{
		let serverQueue = this.discordClient.serverQueues.get(serverId);

		if (serverQueue.songs.length === 0)
		{
			return;
		}

		// Checks if we have a next song to play. If looping, jumps to the beginning.
		let nextSongIndex = serverQueue.playingIndex + 1;
		if (nextSongIndex >= serverQueue.songs.length)
		{
			if (serverQueue.looping)
			{
				nextSongIndex = 0;
			}
			else
			{
				// If we're at the end of queue, just stop current song if this command is used.
				if (serverQueue.audioPlayer.state.status === AudioPlayerStatus.Playing)
				{
					serverQueue.audioPlayer.stop();
				}
				// This message will be sent an extra time if we leave it outside of else{}, 
				// since AudioPlayerStatus.Idle calls into tryPlayNextSong
				else
				{
					let embed = new MessageEmbed()
						.setTitle(`Reach the end of queue.`);
					serverQueue.defaultTextChannel.send({ embeds: [embed] });
				}
				return;
			}
		}

		playSongAtIndex(serverQueue, nextSongIndex);
	},

	tryPlayPrevSong(serverId)
	{
		let serverQueue = this.discordClient.serverQueues.get(serverId);

		if (serverQueue.songs.length === 0)
		{
			return;
		}

		// Checks if we have a prev song to play. If looping, jumps to the last song.
		let prevSongIndex = serverQueue.playingIndex - 1;
		if (prevSongIndex < 0)
		{
			if (serverQueue.looping)
			{
				prevSongIndex = serverQueue.songs.length - 1;
			}
			else
			{
				let embed = new MessageEmbed()
					.setTitle(`This is the first song in the queue.`);
				serverQueue.defaultTextChannel.send({ embeds: [embed] });
				return;
			}
		}

		playSongAtIndex(serverQueue, prevSongIndex);
	},

	tryPlaySongAtIndex(serverId, songIndex)
	{
		let serverQueue = this.discordClient.serverQueues.get(serverId);

		if (songIndex < 0 || songIndex >= serverQueue.songs.length)
		{
			let embed = new MessageEmbed()
				.setTitle(`Please enter a valid number. Current queue is from 1 to ${serverQueue.songs.length}`);
			message.channel.send({ embeds: [embed] });
			return;
		}

		playSongAtIndex(serverQueue, songIndex);
	},
}
// END REGION exports

function requestVoiceConnection(voiceChannel)
{
	let connection = joinVoiceChannel(
		{
			channelId: voiceChannel.id,
			guildId: voiceChannel.guild.id,
			adapterCreator: voiceChannel.guild.voiceAdapterCreator,
		}
	);

	return connection;
}

function requestAudioPlayer(voiceChannel)
{
	const serverId = voiceChannel.guild.id;

	audioPlayer = createAudioPlayer();
	module.exports.setServerAudioPlayer(serverId, audioPlayer);
	audioPlayer.serverId = serverId;

	audioPlayer.currentRetryCount = 0;

	// Bind audio player's events
	audioPlayer.on(AudioPlayerStatus.Idle, async () => 
	{
		// If we went to Idle because we're error handling, take no action
		if (audioPlayer.bIsHandlingError || audioPlayer.bIsCleaningUp)
		{
			return;
		}
		
		audioPlayer.currentRetryCount = 0;

		module.exports.tryPlayNextSong(serverId);
	});

	audioPlayer.on('error', async error => 
	{
		console.log(`Error on ${Date(Date.now())}`);
		console.log(error.message);
		console.log(audioPlayer.state.status);

		// Only handle this error if AudioPlayer couldn't recover from it and became idle
		if (audioPlayer.state.status != AudioPlayerStatus.Idle)
		{
			return;
		}

		audioPlayer.bIsHandlingError = true;

		{
			const embed = new MessageEmbed()
				.setTitle(`Restoring connection from error:`)
				.setDescription(`${error.message}`);
			const serverQueue = module.exports.discordClient.serverQueues.get(serverId);
			serverQueue.defaultTextChannel.send({ embeds: [embed] });
		}

		// Try to play the song again from where we left off. Hopefully the error handling doesn't take too long and skip too much.
		// We previously set the song info in error.resource.metadata
		if (audioPlayer.currentRetryCount < 3)
		{
			createResourceAndPlayOnAudioPlayer(audioPlayer, error.resource.metadata, error.resource.playbackDuration);
			++audioPlayer.currentRetryCount;
		}
		else
		{
			// Error out after 3 tries. The AudioPlayer will go back to Idle and queue the next song automatically.
			const embed = new MessageEmbed()
				.setTitle(`Error playing song ${error.resource.metadata.title}`)
				.setDescription(`${error.message}`);
			const serverQueue = module.exports.discordClient.serverQueues.get(serverId);
			serverQueue.defaultTextChannel.send({ embeds: [embed] });
		}

		audioPlayer.bIsHandlingError = false;
	});

	return audioPlayer;
}

function playSongAtIndex(serverQueue, index)
{
	if (isNaN(index))
	{
		console.error("playSongAtIndex called with NaN index")
		return;
	}

	serverQueue.playingIndex = index;

	// Check index in bound. The tryPlay... functions should have handled oob index, but catch it here anyway. 
	if (serverQueue.playingIndex < 0 || serverQueue.playingIndex >= serverQueue.songs.length)
	{
		let embed = new MessageEmbed()
			.setTitle(`Error playing song: song index in queue oob.`);
		serverQueue.defaultTextChannel.send({ embeds: [embed] });
		return;
	}
	
	const song = serverQueue.songs[serverQueue.playingIndex];

	// Shouldn't be null but just in case
	if (!song)
	{
		let embed = new MessageEmbed()
			.setTitle(`Unexpected error reading song info. Skipping to next...`);
		serverQueue.defaultTextChannel.send({ embeds: [embed] });

		module.exports.tryPlayNextSong(serverQueue.serverId);
		return;
	}

	// Send "Playing" message
	{
		let embed = new MessageEmbed()
			.setTitle("Now playing")
			.setDescription(`**[${song.title}](${song.url})** [<@${song.addedBy}>]`);
		serverQueue.defaultTextChannel.send({ embeds: [embed] })
			// Automatically delete after a set time
			.then(message =>
			{
				setTimeout(() => message.delete(), 180000)
			});
	}

	let audioPlayer = module.exports.getServerAudioPlayer(serverQueue.serverId);
	createResourceAndPlayOnAudioPlayer(audioPlayer, song);
}

// Creates the audio resource from the song and play it on the audio player
async function createResourceAndPlayOnAudioPlayer(audioPlayer, song, startTime = 0)
{
	// Sort of a hack to allow us to get whether there is a pending resource on the audio player before it gets played.
	// Because there is a delay between the call to "play" and when the audio player's state changes.
	audioPlayer.state.resource = true;

	// Audio-only is important, otherwise we'll get into issues where the stream doesn't demux (?) properly
	// and our audioPlayer will throw a "resource already ended" error
	// let readableStream = await ytdl(song.url, 
	// 	{ 
	// 		filter: "audioonly", 
	// 		quality: "highestaudio",
	// 		highWatermark: "",
	// 		begin: `${startTime}ms`,
	// 	});

	// Allows the audio player to start at some time into the song, to handle interruption for example.
	// If start time is not specified, use demuxProbe for optimization.
	let resource;
	// if (startTime > 0)
	// {
	// 	readableStream = fluentFfmpeg({source: readableStream}).toFormat('mp3').setStartTime(Math.ceil(startTime / 1000));
	// 	resource = createAudioResource(readableStream);
	// }
	// else
	// {
	// 	const { stream, type } = await demuxProbe(readableStream); // does not work with fluentFfmpeg's output
	// 	resource = createAudioResource(stream, { inputType: type });
	// }

	// Using playdl in place of ytdl due to an "aborted" issue with miniget in the latter
	// More info here: https://github.com/fent/node-ytdl-core/issues/902
	const { stream, type } = await playdl.stream(song.url, 
	{
		discordPlayerCompatibility: true,
		quality: 2,
		seek: Math.ceil(startTime / 1000),
	});

	resource = createAudioResource(stream, { inputType: type });
	resource.metadata = song;

	audioPlayer.play(resource);
}

// For debugging
function sendCustomError(audioPlayer, resource)
{
	const error = new Error();
	error.resource = resource;
	error.message = "Test error";
	audioPlayer.emit('error', error);
}