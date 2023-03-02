// Contains event handlers for our Redis client

const Bluebird = require('bluebird');
const Redis = require("redis");
Bluebird.promisifyAll(Redis);

const {serverPrefixesDBKeys, personalListsDBKeys} = require("./redisConfig.json");

async function bindRedisEvents(redisClient)
{
	const botIndex = require("./envSetup.js").botIndex;
	const serverPrefixesDBKey = serverPrefixesDBKeys[botIndex];
	const personalListsDBKey = personalListsDBKeys[botIndex];

	// Save this info in the client for later access
	redisClient.botIndex = botIndex;
	redisClient.serverPrefixesDBKey = serverPrefixesDBKey;
	redisClient.personalListsDBKey = personalListsDBKey;

	async function addKeysIfNotExist()
	{
		// Init the server prefixes K/V pair if it doesn't exist
		let serverPrefixesStr = await redisClient.get(serverPrefixesDBKey);
		if (serverPrefixesStr === null)
		{
			await redisClient.Toolkit.redisSetKey(serverPrefixesDBKey, []);
		}

		// Init the personal playlist K/V pair if it doesn't exist
		let personalListsStr = await redisClient.get(personalListsDBKey);
		if (personalListsStr === null)
		{
			await redisClient.Toolkit.redisSetKey(personalListsDBKey, []);
		}
	}
	
	try 
	{
		await redisClient.ping()
		await addKeysIfNotExist();
	}
	catch (error)
	{
		// Redis is not yet ready. Bind to ready event to add keys.
		redisClient.on("ready", async function()
		{
			await addKeysIfNotExist();
		});
	}
	
	redisClient.on("error", function(error)
	{
		console.error("Received Redis error: " + error);
		process.exit(2);
	});
}

exports.bindRedisEvents = bindRedisEvents;
