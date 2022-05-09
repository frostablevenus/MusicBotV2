const { Conditions } = require("../commandConditions.js");

module.exports = 
{
	aliases : [],
	description : "Disconnects the bot from the voice channel.",

	userPermissionsRequired: [],
	botPermissionsRequired: [],
	conditions :
	[
		Conditions.CONNECTION_IS_SET_UP,
	],

	async execute(message)
	{
		message.discordClient.Toolkit.cleanUpServerConnection(message.guild.id);
		message.react('👌');
	},
};