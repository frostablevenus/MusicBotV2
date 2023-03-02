//////////////////////////////////////////////////////////////////////////////
/// -------------------------------Logins--------------------------------- ///
//////////////////////////////////////////////////////////////////////////////
// Manages logins for required clients (discord, redis)

const Discord = require('discord.js');
const Redis = require("redis");

const fs = require('fs');

const botIndex = require("./envSetup.js").botIndex;

module.exports = 
{
	async loginRedis()
	{
		// Read Redis configs
		let configJSON;
		if (fs.existsSync("./config.json"))
		{
			const data = fs.readFileSync("./config.json");
			configJSON = JSON.parse(data);
		}
	
		// let redisURL = process.env.REDIS_URL ? process.env.REDIS_URL : configJSON.redisURL;
		let redisHost = process.env.REDIS_HOST ? process.env.REDIS_HOST : configJSON.redisHost;
		let redisPort = process.env.REDIS_PORT ? process.env.REDIS_PORT : configJSON.redisPort;
		// let redisUsername = process.env.REDIS_USERNAME ? process.env.REDIS_USERNAME : configJSON.redisUsername;
		let redisPassword = process.env.REDIS_PASSWORD ? process.env.REDIS_PASSWORD : configJSON.redisPassword;
	
		// let redisURL = `redis://${redisUsername}:${redisPassword}@${redisHost}:${redisPort}`;
	
		if (/*!redisURL ||*/ !redisHost || !redisPort || !redisPassword)
		{
			throw ("Missing database information.");
		}
	
		let redisClient = Redis.createClient(/*redisURL,*/
		{
			socket:
			{
				host: redisHost,
				port: redisPort,
			},
	
			password: redisPassword,
	
			retry_strategy: function(options)
			{
				if (options.error && options.error.code === "ECONNREFUSED")
				{
					// End reconnecting on a specific error and flush all commands with
					// a individual error
					return new Error("The server refused the connection");
				}
				if (options.total_retry_time > 1000 * 60 * 60)
				{
					// End reconnecting after a specific timeout and flush all commands
					// with a individual error
					return new Error("Retry time exhausted");
				}
				if (options.attempt > 10)
				{
					// End reconnecting with built in error
					return undefined;
				}
	
				// reconnect after
				return Math.min(options.attempt * 100, 3000);
			},
		});

		await redisClient.connect();

		return redisClient;
	},

	async loginDiscord()
	{
		// Look for token in env variable, if that doesn't exist then pull from local config
		let token; 
		if (process.env.DJS_TOKENS)
		{
			const tokens = process.env.DJS_TOKENS.split(',');
			token = tokens[botIndex];
		}

		if (!token)
		{
			const data = fs.readFileSync("./config.json");
			const configJSON = JSON.parse(data);
			token = configJSON.tokens[botIndex];
		}

		if (!token)
		{
			throw ("No token found.");
		}

		const Intents = Discord.Intents;

		let discordClient = new Discord.Client({ intents: [
			Intents.FLAGS.GUILDS, 
			Intents.FLAGS.GUILD_MESSAGES,
			Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
			Intents.FLAGS.GUILD_VOICE_STATES,
		]});

		await discordClient.login(token);

		return discordClient;
	}
}