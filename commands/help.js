const { MessageEmbed } = require('discord.js');

module.exports = 
{
	aliases : ["h"],
	description : "Displays the help menu",

	userPermissionsRequired: [],
	botPermissionsRequired: [],
	conditions : [],

	async execute(message) 
	{
		let helpStr = "";
		const discordClient = message.discordClient;

		for (let [commandName, command] of discordClient.commands)
		{
			helpStr += "**" + commandName;
			if (command.aliases.length > 0)
			{
				helpStr += " (";
				for (let alias of command.aliases)
				{
					helpStr += alias + ", ";
				}
				helpStr = helpStr.substring(0, helpStr.length - 2);
				helpStr += ")";
			}
			helpStr += "**: " + command.description + "\n\n";
		}
		
		let embed1 = new MessageEmbed()
			.setTitle("To start, ~play any song or playlist! (Youtube only)");
	
		let embed2 = new MessageEmbed()
			.setTitle("List of commands")
			.setDescription(helpStr);
		message.channel.send({ embeds: [embed1, embed2] });
	},
};
