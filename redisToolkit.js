// Functions that are added to a redis client to expand its functionalities.

module.exports = 
{
	redisClient : null,

	async getServerPrefix(serverid)
	{
		const serverPrefixes = await this.redisGetKey(this.redisClient.serverPrefixesDBKey);

		for (let serverPrefix of serverPrefixes)
		{
			if (serverPrefix.serverId === serverid)
			{
				return serverPrefix.prefix;
			}
		}

		return require("./envSetup.js").defaultPrefix;
	},

	async redisGetKey(key)
	{
		const dataStr = await this.redisClient.get(key);
		return JSON.parse(dataStr);
	},

	async redisSetKey(key, data)
	{
		let dataStr = JSON.stringify(data, null, 2);
		await this.redisClient.set(key, dataStr);
	},
}