module.exports = 
{
	failureMessage: "This bot is currently being used in another channel.",

	check(message) 
	{
		return !message.guild.members.me.voice.channel || message.guild.members.me.voice.channel == message.member.voice.channel;
	},
};