// Processes command line args to determine which bot instance we're on
// Also evaluates the default prefix and server name for this bot instance.

var botIndex = 0;
const numBots = 4;

const defaultPrefixes = ['~', "~~", "~~~", "testbot "];
const serverNicknames = ["TakoJam", "TakoJam 2", "TakoJam 3", "TakoJam Test"]

{
	if (process.argv.length != 3)
	{
		console.error("Usage: node index.js [bot index]");
		process.exit(1);
	}
	
	if (process.argv[2] === "test")
	{
		botIndex = numBots - 1;
	}
	else
	{
		botIndex = parseInt(process.argv[2]);
	}

	if (isNaN(botIndex) || botIndex < 0 || botIndex >= numBots)
	{
		console.error("Usage: node index.js [bot index]");
		process.exit(1);
	}
}

const defaultPrefix = defaultPrefixes[botIndex];
const serverNickname = serverNicknames[botIndex];

exports.botIndex = botIndex;
exports.defaultPrefix = defaultPrefix;
exports.serverNickname = serverNickname;
exports.serverNicknames = serverNicknames;
