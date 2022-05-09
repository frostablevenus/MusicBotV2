//////////////////////////////////////////////////////////////////////////////
/// -------------------------------index.js------------------------------- ///
//////////////////////////////////////////////////////////////////////////////
// This serves as the entry to the program.
// It handles setting up the logins for our Redis and Discord clients,
// adding functionalities (toolkits) to them for commands to use,
// and binding event handlers to these clients.

const { Collection } = require('discord.js');
const fs = require('node:fs');

const { bindDiscordEvents } = require("./eventHandlersDiscord.js");
const { bindRedisEvents } = require("./eventHandlersRedis.js");

// Logins
let redisClient = require("./logins.js").redisClient;
let discordClient = require("./logins.js").discordClient;

// Add function toolkits to our Redis and Discord clients
redisClient.Toolkit = require("./redisToolkit.js");
redisClient.Toolkit.redisClient = redisClient;

discordClient.Toolkit = require("./discordToolkit.js");
discordClient.Toolkit.discordClient = discordClient;

discordClient.redisClient = redisClient;

// serverQueues is our main runtime data structure.
discordClient.serverQueues = new Collection();

// Parse commands and conditions
parseCommandFiles();
parseConditionFiles();

bindRedisEvents(redisClient);
bindDiscordEvents(discordClient);

//////////////////////////////////////////////////////////////////////////////
/// -------------------------------Helpers-------------------------------- ///
//////////////////////////////////////////////////////////////////////////////
// Read command files and save these execution objects on the client object.
function parseCommandFiles()
{
	discordClient.commands = new Collection();
	const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

	for (const file of commandFiles)
	{
		const command = require(`./commands/${file}`);
		const commandName = file.slice(0, -3); // removes the .js

		discordClient.commands.set(commandName, command);
	}
}

function parseConditionFiles()
{
	discordClient.conditions = new Collection();
	const conditionFiles = fs.readdirSync('./conditions').filter(file => file.endsWith('.js'));

	for (const file of conditionFiles)
	{
		const condition = require(`./conditions/${file}`);
		const conditionName = file.slice(0, -3); // removes the .js

		discordClient.conditions.set(conditionName, condition);
	}
}