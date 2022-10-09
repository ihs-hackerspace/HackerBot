import { Client, GatewayIntentBits, REST, Routes, ChannelType, PermissionsBitField, } from 'discord.js';
import { BOT_TOKEN, CLIENT_ID, FIREBASE_AUTH } from './config.mjs'
const bot = new Client({ intents: [GatewayIntentBits.Guilds] });
const rest = new REST({ version: '10' }).setToken(BOT_TOKEN);

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
initializeApp({ credential: cert(FIREBASE_AUTH) });
const db = getFirestore();

import { commands } from './commands/commands.mjs';
import { ONGOING_PROJECTS_CHANNEL } from './constants.mjs';

let ProjectsWidget;

function toTitleCase(str) {
    return str
        .replaceAll("-", " ")
        .replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase())
}

function differenceOfDays(date1, date2) {
    const oneDay = 1000 * 60 * 60 * 24;
    const diffInTime = date2.getTime() - date1.getTime();
    const diffInDays = Math.round(diffInTime / oneDay);
    return diffInDays;
}

async function updateOngoingProjectsWidget(oldProjectsWidget) {
    const ongoingProjectsChannel = bot.channels.cache.get(ONGOING_PROJECTS_CHANNEL);
    const snapshot = await db.collection('Projects').get();

    // https://discordjs.guide/popular-topics/embeds.html#embed-preview
    const ongoingProjectsEmbed = {
        color: 0x0099ff,
        title: 'Ongoing Projects',
        // thumbnail: { url: bot.user.displayAvatarURL() },
        description: '\n\n',
        fields: [
            // Dont Ask
            ...((() =>
                snapshot.docs
                    .filter(doc => doc.data()["ongoing"])
                    .map(doc => {
                        const project = doc.data();
                        const dayDifference = differenceOfDays(project['start-date'].toDate(), new Date())
                        return {
                            name: `${toTitleCase(project["name"])} - ${dayDifference} day${dayDifference != 1 ? "s" : ""}`,
                            value: `
                                ${project["description"]}
                                ${(() => {
                                    let leadersString = ``;
                                    project["project-leaders"].forEach(leader => {
                                        leadersString += `- <@${leader}>`
                                    })
                                    return leadersString;
                                })()}
                                \n\u200b
                            `,
                            inline: true,
                        }
                    })
            )()),
        ],
        timestamp: new Date().toISOString(),
        footer: {
            text: 'IHS HackerBot',
            icon_url: bot.user.displayAvatarURL(),
        },
    };

    if (!oldProjectsWidget) {
        // delete old widget (and any other messages that could somehow get there if someone is trolling)
        const messages = await ongoingProjectsChannel.messages.fetch();
        await ongoingProjectsChannel.bulkDelete(messages);

        // send new widget
        return (await ongoingProjectsChannel.send({ embeds: [ongoingProjectsEmbed] }));
    } else {
        return (await oldProjectsWidget.edit({ embeds: [ongoingProjectsEmbed] }));
    }
}

// Tell Discord what commands the bot has
(async () => {
    try {
        console.log('Started refreshing application (/) commands.');
        await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
})();

// Wait for the bot to be ready
bot.on('ready', async () => { 
    console.log(`Logged in as ${bot.user.tag}!`);
    ProjectsWidget = await updateOngoingProjectsWidget(ProjectsWidget);
});

// Run the onCall function for whatever command was sent
bot.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    commands.forEach(async command => {
        if (command.name === interaction.commandName) {
            await command.onCall(interaction, db);
            ProjectsWidget = await updateOngoingProjectsWidget(ProjectsWidget);
        }
    })
});

bot.login(BOT_TOKEN);


/*
new SlashCommandBuilder()
	.addStringOption(option => option.setName('input').setDescription('Your name?'))
	.addBooleanOption(option => option.setName('bool').setDescription('True or False?'))
	.addUserOption(option => option.setName('target').setDescription('Closest friend?'))
	.addChannelOption(option => option.setName('destination').setDescription('Favourite channel?'))
	.addRoleOption(option => option.setName('role').setDescription('Least favourite role?'))
	.addIntegerOption(option => option.setName('int').setDescription('Sides to a square?'))
	.addNumberOption(option => option.setName('num').setDescription('Value of Pi?'))
	.addMentionableOption(option => option.setName('mentionable').setDescription('Mention something!'))
	.addAttachmentOption(option => option.setName('attachment').setDescription('Best meme?'));

const snapshot = await db.collection('users').get();
snapshot.forEach((doc) => {
  console.log(doc.id, '=>', doc.data());
});
*/