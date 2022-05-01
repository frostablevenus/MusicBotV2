const { Conditions } = require("../commandConditions.js");
const { MessageEmbed } = require('discord.js');

module.exports = 
{
	aliases : ["repeat"],
	description : "Loops the queue.",

	userPermissionsRequired: [],
	botPermissionsRequired: [],
	conditions : 
	[
		Conditions.AUTHOR_IN_VOICE_CHANNEL,
		Conditions.CONNECTION_IS_SET_UP,
	],

	async execute(message) 
	{
		let serverQueue = message.discordClient.serverQueues.get(message.guild.id);
		serverQueue.looping = !serverQueue.looping;

		let embed = new MessageEmbed()
			.setTitle("Looping for this queue is now " + (serverQueue.looping ? "**enabled**" : "**disabled**"));
		message.channel.send({ embeds: [embed] });
	},
};
