const { Client, GatewayIntentBits, REST, Routes } = require('discord.js');
const { BOT_TOKEN, CLIENT_ID } = require('./config')
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const rest = new REST({ version: '10' }).setToken(BOT_TOKEN);

const commands = [
    {
        name: 'start-new-project',
        description: 'Start a new project and memebers who wish to work on the project!',
    },
    {
        name: 'mark-project-complete',
        description: 'For when your project is completed',
    },
    {
        name: 'unmark-project-complete',
        description: 'For when you accidentally marked your project complete',
    },
    {
        name: 'add-project-member',
        description: 'Adds a new person to your project (only project LEADERS can do this)',
    },
    {
        name: 'add-project-leader',
        description: 'Adds a new leader to your project (only the project CREATOR can do this)',
    },
    {
        name: 'remove-project-member',
        description: 'Removes a person from your project (only project LEADERS can do this)',
    },
    {
        name: 'remove-project-leader',
        description: 'Removes a leader froms your project (only the project CREATOR can do this)',
    },
];

(async () => {
    try {
        console.log('Started refreshing application (/) commands.');

        await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });

        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
})();

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'ping') {
        // await interaction.reply('Pong!');
        await interaction.reply({ content: 'Pong!', ephemeral: true });
    }
});

client.login(BOT_TOKEN);