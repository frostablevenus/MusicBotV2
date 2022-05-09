const { Conditions } = require("../commandConditions.js");

module.exports = 
{
	aliases : ["jump"],
	description : "Skips to the specified song number, or the next song if left blank.",

	userPermissionsRequired: [],
	botPermissionsRequired: [],
	conditions : 
	[
		Conditions.AUTHOR_IN_VOICE_CHANNEL,
		Conditions.CONNECTION_IS_SET_UP,
		Conditions.HAS_SONG_IN_QUEUE,
	],

	async execute(message) 
	{
		if (message.args.extraArgs === "")
		{
			// Treat this as skipping to the next song
			message.discordClient.Toolkit.tryPlayNextSong(message.guild.id);
			return;
		}

		const inputIndex = parseInt(message.args.extraArgs);
		const indexToUse = inputIndex - 1; // Human-readable to computer index
		if (isNaN(inputIndex))
		{
			let embed = new MessageEmbed()
				.setTitle(`Please enter a valid index. Usage: skip [number in queue].`);
				
			message.channel.send({ embeds: [embed] });
			return;
		}

		message.discordClient.Toolkit.tryPlaySongAtIndex(message.guild.id, indexToUse);
	},
};
