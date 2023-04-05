const { Conditions } = require("../commandConditions.js");
const { MessageEmbed } = require('discord.js');

module.exports = 
{
	aliases : [],
	description : "",

	userPermissionsRequired: [],
	botPermissionsRequired: [],
	conditions : 
	[
	],

	async execute(message) 
	{
		let embed = new MessageEmbed()
			.setTitle(`🥖 Bonjour 🥖`);
		message.channel.send({ embeds: [embed] });
	},
};
