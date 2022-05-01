const { MessageEmbed } = require('discord.js');
const { Conditions } = require("../commandConditions.js");

// The structure for user lists goes like this:
/*
(ListCollection)
{
	userId: userId
	lists: 
	[
		(List)
		{
			name: listName,
			songs : 
			[
				(Song)
				{
					title: song.title,
					url: song.url
				},
				(Song),
				(Song),
				...
			]
		},
		(List),
		(List),
		...
	]
},
(ListCollection),
(ListCollection),
...
*/

module.exports = 
{
	aliases : [],
	description : "Save/load current queue to/from playlist. Usage: \"list [save/load/view] [list name]\". Saving an empty queue to a playlist will delete it.",

	userPermissionsRequired: [],
	botPermissionsRequired: [],
	conditions : [],

	async execute(message) 
	{
		const discordClient = message.discordClient;
		const redisClient = discordClient.redisClient;

		const args = message.args;
		const extraArgs = args.extraArgs;

		const extraArgsList = extraArgs.split(/[ ]+/);
		
		const listCommand = extraArgsList[0].toLowerCase();
		const listName = extraArgsList.slice(1).join(" ");

		const userId = message.author.id;

		if (!["save", "load", "view"].includes(listCommand))
		{
			printUsage(message);
			return;
		}

		// The collection of playlists that belongs to this user.
		let userLists = null;
		// The playlist with the name entered.
		let userList = null;

		const allUsersListCollection = await redisClient.Toolkit.redisGetKey(redisClient.personalListsDBKey);

		// Try to find userLists (collection) & userList
		// If either userLists or userList (or both) isn't found, that means we'll have to create them if we're saving
		for (let eachUserListCollection of allUsersListCollection)
		{
			if (eachUserListCollection.userId != userId)
			{
				continue;
			}
			
			// Found the list collection for this user.
			userLists = eachUserListCollection.lists;

			// Try to find the list with the queried name
			for (let list of userLists)
			{
				if (list.name === listName)
				{
					userList = list;
					break;
				}
			}

			break;
		}

		switch (listCommand)
		{
			case "save":
			{
				await listSave(message, allUsersListCollection, userLists, userList, listName);
				break;
			}
			
			case "load":
			{
				await listLoad(message, userList, listName);
				break;
			}

			case "view":
			{
				listView(message, userLists, userList, listName);
				break;
			}

			default:
			{
				printUsage(message);
				return;
			}
		}
	},
};

function printUsage(message)
{
	let embed = new MessageEmbed()
		.setTitle("Usage: \"list [save/load/view] [list name]\".");
	message.channel.send({ embeds: [embed] });
}

async function listSave(message, allUsersListCollection, userLists, userList, listName)
{
	const userId = message.author.id;
	const discordClient = message.discordClient;

	// Need the user to be in a vc and the bot to be playing stuff in the server
	{
		if (!discordClient.Toolkit.checkCondition(message, Conditions.AUTHOR_IN_VOICE_CHANNEL))
		{
			return;
		}
		if (!discordClient.Toolkit.checkCondition(message, Conditions.CONNECTION_IS_SET_UP))
		{
			return;
		}
	}

	if (listName === "")
	{
		printUsage(message);
		return;
	}

	const serverQueue = discordClient.serverQueues.get(message.guild.id);

	// Interpretting this as deleting the list if the queue is empty
	if (serverQueue.songs.length === 0)
	{
		if (userLists && userList)
		{
			userLists.splice(userLists.indexOf(userList), 1);
		}

		// Delete the collection too, if it's now empty
		if (userLists.length === 0)
		{
			allUsersListCollection.splice(allUsersListCollection.indexOf(userLists), 1);
		}
	}
	else
	{
		// Get the songs from the current queue
		let listSongs = [];
		for (let song of serverQueue.songs)
		{
			const newSong = 
			{
				title: song.title,
				url: song.url
			}
			listSongs.push(newSong);
		}

		// Update the playlist if it exists
		if (userList)
		{
			userList.songs = listSongs;
		}
		// Else add a new playlist with these songs to the collection
		else
		{
			const newUserList =
			{
				name: listName,
				songs : listSongs
			}

			// Add or existing list collection
			if (userLists)
			{
				userLists.push(newUserList);
			}
			// Create a new list collection
			else
			{
				let newListCollection =
				{
					userId: userId,
					lists: [newUserList]
				};
				allUsersListCollection.push(newListCollection);
			}
		}
	}

	const redisClient = discordClient.redisClient;
	await redisClient.Toolkit.redisSetKey(redisClient.personalListsDBKey, allUsersListCollection);

	message.react('👌');
}

async function listLoad(message, userList, listName)
{
	const userId = message.author.id;
	const discordClient = message.discordClient;

	// Need the user to be in a vc and the bot to be free
	{
		if (!discordClient.Toolkit.checkCondition(message, Conditions.AUTHOR_IN_VOICE_CHANNEL))
		{
			return;
		}
		if (!discordClient.Toolkit.checkCondition(message, Conditions.BOT_IS_FREE))
		{
			return;
		}
	}

	if (listName === "")
	{
		printUsage(message);
		return;
	}

	if (userList === null)
	{
		let embed = new MessageEmbed()
			.setTitle(`Playlist not found.`);
		message.channel.send({ embeds: [embed] });
		return;
	}

	// Shouldn't happen but just in case. Saving an empty playlist should delete that entry from the collection. 
	if (userList.songs.length === 0)
	{
		let embed = new MessageEmbed()
			.setTitle(`This playlist is empty.`);
		message.channel.send({ embeds: [embed] });
	}

	// Clear the current queue if it's not empty currently
	if (discordClient.Toolkit.hasSongInQueueInServer(message.guild.id))
	{
		const clearCommand = require("./clear.js");
		await discordClient.Toolkit.executeCommand(message, clearCommand);
	}

	const playCommand = require("./play.js");
	message.args.bIsFromPlaylist = true;
	message.args.songs = userList.songs;

	await discordClient.Toolkit.executeCommand(message, playCommand);
}

async function listView(message, userLists, userList, listName)
{
	// If the list name wasn't specified, send the list collection
	if (listName == "")
	{
		if (!userLists || userLists.length === 0)
		{
			let embed = new MessageEmbed()
				.setTitle(`You do not have any saved playlist.`);
			message.channel.send({ embeds: [embed] });
			return;
		}
	
		let playlistStr = "";
		for (let list of userLists)
		{
			playlistStr += list.name + "\n";
		}
	
		let embed = new MessageEmbed()
			.setTitle(`${message.author.username}'s playlists`)
			.setDescription(playlistStr);
		message.channel.send({ embeds: [embed] });
	}
	// If the list name was specified, send the list itself
	else
	{
		if (!userList)
		{
			let embed = new MessageEmbed()
				.setTitle(`Playlist not found.`);
			message.channel.send({ embeds: [embed] });
			return;
		}

		let playlistStr = "";
		const numSongsToDisplay = 20;
		for (let i = 0; i < Math.min(userList.songs.length, numSongsToDisplay); i++) 
		{
			const song = userList.songs[i];
			playlistStr += `${i + 1}. ${song.title}\n`;
		}

		if (userList.songs.length > numSongsToDisplay)
		{
			playlistStr += `*and ${userList.songs.length - numSongsToDisplay} more song(s)*`;
		}
	
		let embed = new MessageEmbed()
			.setTitle(`${message.author.username}'s playlist \"${listName}\":`)
			.setDescription(playlistStr);
		message.channel.send({ embeds: [embed] });
	}
}