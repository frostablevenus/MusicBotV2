module.exports = 
{
	failureMessage: "No song has been queued. ~play to begin.",

	check(message) 
	{
		const serverId = message.guild.id;
		return message.discordClient.Toolkit.isConnectionSetUp(serverId);
	},
};
