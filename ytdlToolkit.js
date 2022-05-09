const ytdl = require('ytdl-core');
const yts = require("yt-search");
const ytpl = require('ytpl');
const { MessageEmbed } = require('discord.js');

module.exports = 
{
	async getSongsInfo(message, contentToPlay)
	{
		let songs = [];

		const tryPlayLink = async (content) =>
		{
			// Youtube - Single vid
			if (ytdl.validateURL(content))
			{
				let songInfo;
				try
				{
					songInfo = await ytdl.getInfo(content);
				}
				catch (error)
				{
					let embed = new MessageEmbed()
						.setTitle("Invalid video link")
						.setDescription(error);
					message.channel.send({ embeds: [embed] });
					return false;
				}
				
				const song =
				{
					title: songInfo.videoDetails.title,
					url: songInfo.videoDetails.video_url,
				};
				songs.push(song);

				return true;
			}
		};

		if (await tryPlayLink(contentToPlay))
		{
			return songs;
		}
		else
		{
			const linkifiedContent = "https://www.youtube.com/watch?v=" + contentToPlay;
			if (await tryPlayLink(linkifiedContent))
			{
				return songs;
			}
		}
		
		// Youtube - Playlist
		if (ytpl.validateID(contentToPlay))
		{
			const playistID = await ytpl.getPlaylistID(contentToPlay);
			let playlist;
			try
			{
				playlist = await ytpl(playistID, { limit : Infinity });
			}
			catch (error)
			{
				let embed = new MessageEmbed()
					.setTitle("Invalid/Private playlist link")
					.setDescription("Code monkey message: " + error.message);
				message.channel.send({ embeds: [embed] });
				return songs;
			}

			for(let playlistSongInfo of playlist.items)
			{
				const song =
				{
					title: playlistSongInfo.title,
					url: playlistSongInfo.shortUrl,
				};
				songs.push(song);
			}

			return songs;
		}

		// Title search
		const {videos} = await yts({ query: contentToPlay, category: 'music'});
		if (!videos.length)
		{
			let embed = new MessageEmbed()
				.setTitle("No songs found.");
			message.channel.send({ embeds: [embed] });
			return songs;
		}

		const song =
		{
			title: videos[0].title,
			url: videos[0].url,
		};

		songs.push(song);
		return songs;
	}
}