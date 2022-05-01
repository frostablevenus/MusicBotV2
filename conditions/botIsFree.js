module.exports = 
{
	failureMessage: "This bot is currently being used in another channel.",

	check(message) 
	{
		return !message.guild.me.voice.channel || message.guild.me.voice.channel == message.member.voice.channel;
	},
};