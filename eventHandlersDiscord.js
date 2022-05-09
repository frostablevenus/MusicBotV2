// Contains event handlers for our Discord client

const { MessageEmbed } = require('discord.js');
const { VoiceConnectionStatus, entersState } = require('@discordjs/voice');
const { prevQueuePage, nextQueuePage } = require('./commands/queue.js');

module.exports = 
{
	bindDiscordEvents(discordClient)
	{
		discordClient.on('ready', () =>
		{
			console.log('Discord connected!');
		});
	
		discordClient.on('reconnecting', () =>
		{
			console.log('Discord reconnecting...');
		});
	
		discordClient.on('disconnect', () =>
		{
			console.log('Discord disconnected!');
		});
	
		discordClient.on('messageCreate', async message =>
		{
			// Ignore other bot messages
			if (message.author.bot)
			{
				return;
			}
	
			// If there is no production env variable, treat this as a test run and only accept input from my test servers
			const bIsTestServer = ["623983203753132032"].includes(message.guild.id);
			if (process.env.NODE_ENV != "production" && !bIsTestServer)
			{
				return;			
			}
	
			// Does this message start with a mention for this bot?
			const thisBotID = message.guild.me.id;
			const bStartsWithMention = message.content.startsWith(`<@${thisBotID}>`) || message.content.startsWith(`<@!${thisBotID}>`);
	
			// Does this message start with the set prefix?
			const prefix = await discordClient.redisClient.Toolkit.getServerPrefix(message.guild.id);
			const bStartsWithPrefix = message.content.startsWith(prefix);
	
			if (!bStartsWithMention && !bStartsWithPrefix)
			{
				return;
			}
	
			// Parse message to args. Save this in the message to access it later.
			const args = parseMessageToArgs(message, prefix, discordClient.commands);
	
			// Get command from our command list
			const command = discordClient.commands.get(args.commandName);
			if (!command) 
			{
				let embed = new MessageEmbed()
					.setTitle(`Couldn't find command "${args.commandName}". Refer to "help" for more information.`);
				message.channel.send({ embeds: [embed] });
				return;
			}
	
			// Execute the command
			message.discordClient = discordClient;
			message.args = args;
	
			discordClient.Toolkit.executeCommand(message, command);
		});
	
		const OnMessageReaction = (reaction, user) =>
		{
			let message = reaction.message;
			message.discordClient = discordClient;
	
			let emoji = reaction.emoji;
		
			if (message.author.id != discordClient.user.id) // Only handle reactions on our messages
			{
				return;
			}
		
			if (user.id === message.author.id) // Disregard our own reactions
			{
				return 
			}
	
			if (message.embeds.length === 0) // Assume all our messages are embedded
			{
				return;
			}
			
			const embed = message.embeds[0];
		
			if (embed.title.startsWith(`Current queue`))
			{
				try
				{
					if (emoji.name === '⬅️')
					{
						prevQueuePage(message);
					}
					else if (emoji.name === '➡️')
					{
						nextQueuePage(message);
					}
				}
				catch(error)
				{
					console.error(error);				
				}
			}
		}
	
		discordClient.on('messageReactionAdd', (reaction, user) =>
		{
			OnMessageReaction(reaction, user);
		});
	
		discordClient.on('messageReactionRemove', (reaction, user) =>
		{
			OnMessageReaction(reaction, user);
		});
	},

	bindVoiceConnectionEvents(connection, discordClient, serverId)
	{
		connection.on(VoiceConnectionStatus.Disconnected, async (oldState, newState) => 
		{
			try 
			{
				console.log(`Disconnected from voice activity in ${serverId}. Attempting to reconnect...`);
				await Promise.race(
				[
					entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
					entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
				]);
				// Seems to be reconnecting to a new channel - ignore disconnect
			} 
			catch (error) 
			{
				// Seems to be a real disconnect which SHOULDN'T be recovered from
				console.log("Couldn't reconnect to voice activity in ${serverId}. Removing states...");

				discordClient.Toolkit.cleanUpServerConnection(serverId);
			}
		});
	},
}


function parseMessageToArgs(message, prefix, commands)
{
	let inputCommandName;

	// Trim off the invocation method (either by prefix or mention) to get the list of arguments
	let args = [];
	let bIsPrefixCall = message.content.startsWith(prefix);

	if (bIsPrefixCall)
	{
		args = message.content.slice(prefix.length).trim().split(/[ \n]+/); // Delete the prefix, then split by white spaces
	}
	else
	{
		args = message.content.trim().split(/[ \n]+/).slice(1); // Split by white spaces, then skip the first part (mention)
	}

	// The command should be the first "word"
	inputCommandName = args.length === 0 ? "" : args[0];
	inputCommandName = inputCommandName.toLowerCase();

	// Extra args
	extraArgsList = args.slice(1);
	const extraArgs = extraArgsList.join(" ");

	// Convert aliases to names
	for (let [commandName, command] of commands)
	{
		if (inputCommandName === commandName)
		{
			break;
		}
		if (command.aliases.includes(inputCommandName))
		{
			inputCommandName = commandName;
			break;
		}
	}

	const outArgs =
	{
		prefix: prefix,
		commandName: inputCommandName,
		extraArgs: extraArgs,
		extraArgsList: extraArgsList,
		fromMention: !bIsPrefixCall,
	}

	return outArgs;
}
