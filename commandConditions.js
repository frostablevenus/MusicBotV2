// Defines a list of conditions that must be true for certain commands to execute
const Conditions =
{
	AUTHOR_IN_VOICE_CHANNEL: "authorInVoiceChannel",
	BOT_IS_FREE: "botIsFree",
	CONNECTION_IS_SET_UP: "connectionIsSetUp",	// Bot has been called with ~play and successfully connected to the voice channel
	HAS_SONG_IN_QUEUE: "hasSongInQueue",		// Queue currently contains song(s)
}

exports.Conditions = Conditions;