module.exports = 
{
	failureMessage: "You need to be in a voice channel to use this command.",

	check(message) 
	{
		return message.member.voice.channel != null;
	},
};