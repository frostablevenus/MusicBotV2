const { MessageEmbed } = require('discord.js');

module.exports = 
{
	aliases : [],
	description : "Pong",

	userPermissionsRequired: [],
	botPermissionsRequired: [],
	conditions : [],

	async execute(message) 
	{
		let embed = new MessageEmbed()
			.setTitle(`Pong.`);
		message.channel.send({ embeds: [embed] });
	},
};
