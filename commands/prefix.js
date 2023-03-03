const { MessageEmbed } = require('discord.js');
const { defaultPrefix, serverNicknames, botIndex } = require("../envSetup.js");

module.exports = 
{
	aliases : [],
	description : "Changes the prefix of this bot",

	userPermissionsRequired: [],
	botPermissionsRequired: [],
	conditions : [],

	async execute(message)
	{
		const args = message.args;
		const redisClient = message.discordClient.redisClient;
		const redisToolkit = redisClient.Toolkit;
		
		if (args.extraArgs === "")
		{
			let embed = new MessageEmbed()
				.setTitle(`Usage: ${args.prefix}prefix [new prefix]`);
			message.channel.send({ embeds: [embed] });
			return;
		}

		const newPrefix = args.extraArgs;
		const serverId = message.guild.id;
		const prefix = await redisToolkit.getServerPrefix(message.guild.id);

		// Get the prefix map value from DB, edit this entry, and set the edited version as the new value.
		const serverPrefixes = await redisToolkit.redisGetKey(await redisClient.serverPrefixesDBKey);

		// Check if this server currently exists in the DB
		let bFoundPrefixEntry = false;
		for (let i = 0; i < serverPrefixes.length; ++i)
		{
			let serverPrefixPair = serverPrefixes[i];
			if (serverPrefixPair.serverId === serverId)
			{
				if (newPrefix === defaultPrefix)
				{
					serverPrefixes.splice(i, 1);
				}
				else
				{
					serverPrefixPair.prefix = newPrefix;
				}

				bFoundPrefixEntry = true;
				break;
			}
		}

		if (!bFoundPrefixEntry)
		{
			// Put this into the json obj array
			serverPrefixes.push(
			{
				"serverId" : serverId,
				"prefix" : newPrefix
			});
		}

		await redisToolkit.redisSetKey(redisClient.serverPrefixesDBKey, serverPrefixes)

		let embed = new MessageEmbed()
			.setTitle(`Prefix set to ${newPrefix}`);
		message.channel.send({ embeds: [embed] });

		// Change our nickname to the new prefix
		if (!message.guild.members.me.permissions.has("CHANGE_NICKNAME"))
		{
			let embed = new MessageEmbed()
				.setTitle(`Failed to update my nickname with the new prefix. Please give me this permission if you want this to happen automatically.`);
			message.channel.send({ embeds: [embed] });
		}
		else
		{
			message.guild.members.me.setNickname(serverNicknames[botIndex] + " [" + newPrefix + "]");
		}
	},
};
