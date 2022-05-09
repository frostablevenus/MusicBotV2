module.exports = 
{
	failureMessage: "The queue is currently empty.",

	check(message) 
	{
		const serverId = message.guild.id;
		return message.discordClient.Toolkit.hasSongInQueueInServer(serverId);
	},
};
