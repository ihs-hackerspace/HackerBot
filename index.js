const { Client, GatewayIntentBits, REST, Routes, ChannelType, PermissionsBitField, SlashCommandBuilder } = require('discord.js');
const { BOT_TOKEN, CLIENT_ID, FIREBASE_AUTH } = require('./config')
const bot = new Client({ intents: [GatewayIntentBits.Guilds] });
const rest = new REST({ version: '10' }).setToken(BOT_TOKEN);

const { initializeApp, applicationDefault, cert } = require('firebase-admin/app');
const { getFirestore, Timestamp, FieldValue } = require('firebase-admin/firestore');
initializeApp({ credential: cert(FIREBASE_AUTH) });
const db = getFirestore();

const YOUR_PROJECTS_CATEGORY = "1028394596352409691"
const OLD_PROJECTS_CATEGORY = "1028440069868113951";
const ONGOING_PROJECTS_CHANNEL = "1028375365577605140";

const commands = [
    {
        name: 'ping',
        description: 'pong',
        options: [
            {
                name: "input",
                description: "The input to echo back",
                required: true,
                type: 3, // https://discord.com/developers/docs/interactions/application-commands#application-command-object-application-command-option-type
            },
        ],
        onCall: async (interaction) => {
            await interaction.reply({ content: 'Pog!', ephemeral: true });
        }
    },
    {
        name: 'create-new-project',
        description: 'Create a new project and memebers who wish to work on the project!',
        options: [
            {
                name: "project-name",
                description: "The name of your new project",
                required: true,
                type: 3,
            },
            {
                name: "project-description",
                description: "The description of your new project",
                required: true,
                type: 3,
            },
        ],
        onCall: async (interaction) => {
            try {
                const projectName = interaction.options.getString("project-name");
                const snapshot = await db.doc(`Projects/${projectName}`).get();

                if (!snapshot.exists) {
                    const projectDescription = interaction.options.getString("project-description");
                    const projectAdmin = interaction.user.id;

                    // Create a channel in the "Your Projects" category 
                    const channel = await interaction.guild.channels.create({
                        name: projectName,
                        type: ChannelType.GuildText,
                        parent: YOUR_PROJECTS_CATEGORY,
                        permissionOverwrites: [
                            {
                                id: interaction.guild.id,
                                deny: [PermissionsBitField.Flags.ViewChannel],
                            },
                            {
                                id: interaction.user.id,
                                allow: [PermissionsBitField.Flags.ViewChannel],
                            },
                        ],
                    })

                    // Set up firebase project
                    await db.doc(`Projects/${projectName}`).set({
                        'name': projectName,
                        'description': projectDescription,
                        'ongoing': true,
                        'project-admin': projectAdmin,
                        'project-leaders': [ projectAdmin ],
                        'members': [ projectAdmin ],
                        'running-cost': 0,
                        'project-channel': channel.id
                    });

                    // Reply to the user
                    await interaction.reply({ content: `"${projectName}" created`, ephemeral: true });
                    
                } else {
                    await interaction.reply({ content: `Please choose a new name! "${projectName}" already exists`, ephemeral: true });
                }

            } catch (error) {
                await interaction.reply({ content: 'Sorry! Something went wrong!', ephemeral: true });
            }
        }
    },
    {
        name: 'mark-project-complete',
        description: 'For when your project is completed',
        options: [
            {
                name: "project-name",
                description: "The name of your finished project",
                required: true,
                type: 3,
            },
        ],
        onCall: async (interaction) => {
            try {
                const projectName = interaction.options.getString("project-name");
                const snapshot = await db.doc(`Projects/${projectName}`).get();
    
                if (snapshot.exists) {
                    const hasPermission = snapshot.data()["project-leaders"].includes(interaction.user.id);
                    if (!hasPermission) {
                        await interaction.reply({ content: `Nice try but you don't have permission to do that!`, ephemeral: true });
                        return;
                    }

                    const channel = bot.channels.cache.get(snapshot.data()["project-channel"]);
                    channel.setParent(OLD_PROJECTS_CATEGORY);
                    await db.doc(`Projects/${projectName}`).update(({ ongoing: false }));
                } else {
                    await interaction.reply({ content: `"${projectName}" doesn't exists! Please try again!`, ephemeral: true });
                }
    
            } catch (error) {
                await interaction.reply({ content: 'Project completed! Good Job!', ephemeral: true });
            }
        }
    },
    {
        name: 'unmark-project-complete',
        description: 'For when you accidentally marked your project complete',
        options: [
            {
                name: "project-name",
                description: "The name of your old project",
                required: true,
                type: 3,
            },
        ],
        onCall: async (interaction) => {
            try {
                const projectName = interaction.options.getString("project-name");
                const snapshot = await db.doc(`Projects/${projectName}`).get();
    
                if (snapshot.exists) {
                    const hasPermission = snapshot.data()["project-leaders"].includes(interaction.user.id);
                    if (!hasPermission) {
                        await interaction.reply({ content: `Nice try but you don't have permission to do that!`, ephemeral: true });
                        return;
                    }

                    const channel = bot.channels.cache.get(snapshot.data()["project-channel"]);
                    channel.setParent(YOUR_PROJECTS_CATEGORY);
                    await db.doc(`Projects/${projectName}`).update(({ ongoing: true }));
                    await interaction.reply({ content: 'Projected revived!', ephemeral: true });
                } else {
                    await interaction.reply({ content: `"${projectName}" doesn't exists! Please try again!`, ephemeral: true });
                }
    
            } catch (error) {
                await interaction.reply({ content: 'Sorry! Something went wrong!', ephemeral: true });
            }
        }
    },
    {
        name: 'add-project-member',
        description: 'Adds a new person to your project (only project LEADERS can do this)',
        options: [
            {
                name: "project-name",
                description: "The name of your project",
                required: true,
                type: 3,
            },
            {
                name: "member-name",
                description: "The account of the person you want to add",
                required: true,
                type: 6,
            },  
        ],
        onCall: async (interaction) => {
            try {
                const projectName = interaction.options.getString("project-name");
                const newMember = interaction.options.getUser("member-name");
                const snapshot = await db.doc(`Projects/${projectName}`).get();

                if (snapshot.exists) {
                    const hasPermission = snapshot.data()["project-leaders"].includes(interaction.user.id) || snapshot.data()["project-admin"] == interaction.user.id;
                    if (!hasPermission) {
                        await interaction.reply({ content: `Nice try but you don't have permission to do that!`, ephemeral: true });
                        return;
                    }

                    // Add member to members list for project in database
                    if (!snapshot.data()["members"].includes(newMember.id)) {
                        await db.doc(`Projects/${projectName}`).update({ 
                            members: [
                                ...snapshot.data()["members"], 
                                newMember.id
                            ],  
                        })
                    }

                    // Give new member access to the project channel
                    const channel = bot.channels.cache.get(snapshot.data()["project-channel"]);
                    channel.permissionOverwrites.edit(newMember.id, { ViewChannel: true });

                    // Reply
                    await interaction.reply({ content: `Added ${newMember} to "${projectName}"`, ephemeral: true });

                } else {
                    await interaction.reply({ content: `"${projectName}" doesn't exists! Please try again!`, ephemeral: true });
                }

            } catch (error) {
                await interaction.reply({ content: 'Sorry! Something went wrong!', ephemeral: true });
            }
        }
    },
    {
        name: 'add-project-leader',
        description: 'Adds a new leader to your project (only the project CREATOR can do this)',
        options: [
            {
                name: "project-name",
                description: "The name of your project",
                required: true,
                type: 3,
            },
            {
                name: "leader-name",
                description: "The account of the person you want to add",
                required: true,
                type: 6,
            },
        ],
        onCall: async (interaction) => {
            try {
                const projectName = interaction.options.getString("project-name");
                const newMember = interaction.options.getUser("leader-name");
                const snapshot = await db.doc(`Projects/${projectName}`).get();

                if (snapshot.exists) {
                    const hasPermission = snapshot.data()["project-admin"] == interaction.user.id;
                    if (!hasPermission) {
                        await interaction.reply({ content: `Nice try but you don't have permission to do that!`, ephemeral: true });
                        return;
                    }

                    // Add member to members list for project in database
                    if (!snapshot.data()["members"].includes(newMember.id)) {
                        await db.doc(`Projects/${projectName}`).update({ 
                            members: [
                                ...snapshot.data()["members"], 
                                newMember.id
                            ],  
                        })
                    }

                    if (!snapshot.data()["project-leaders"].includes(newMember.id)) {
                        await db.doc(`Projects/${projectName}`).update({ 
                            "project-leaders": [
                                ...snapshot.data()["project-leaders"], 
                                newMember.id
                            ],  
                        })
                    }

                    // Give new member access to the project channel
                    const channel = bot.channels.cache.get(snapshot.data()["project-channel"]);
                    channel.permissionOverwrites.edit(newMember.id, { ViewChannel: true });

                    // Reply
                    await interaction.reply({ content: `Added ${newMember} to "${projectName}"`, ephemeral: true });

                } else {
                    await interaction.reply({ content: `"${projectName}" doesn't exists! Please try again!`, ephemeral: true });
                }

            } catch (error) {
                await interaction.reply({ content: 'Sorry! Something went wrong!', ephemeral: true });
            }
        }
    },
    {
        name: 'remove-project-member',
        description: 'Removes a person from your project (only project LEADERS can do this)',
        options: [
            {
                name: "project-name",
                description: "The name of your project",
                required: true,
                type: 3,
            },
            {
                name: "member-name",
                description: "The account of the person you want to remove",
                required: true,
                type: 6,
            },
        ],
        onCall: async (interaction) => {
            try {
                const projectName = interaction.options.getString("project-name");
                const deletionMember = interaction.options.getUser("member-name");
                const snapshot = await db.doc(`Projects/${projectName}`).get();

                if (snapshot.exists) {
                    const hasPermission = snapshot.data()["project-leaders"].includes(interaction.user.id) || snapshot.data()["project-admin"] == interaction.user.id;
                    if (!hasPermission) {
                        await interaction.reply({ content: `Nice try but you don't have permission to do that!`, ephemeral: true });
                        return;
                    }

                    // Remove member to members list for project in database
                    await db.doc(`Projects/${projectName}`).update(
                        { 
                            members: [
                                ...snapshot.data()["members"].filter(m => m !== deletionMember.id), 
                            ],
                            "project-leaders": [
                                ...snapshot.data()["project-leaders"].filter(m => m !== deletionMember.id), 
                            ] 
                        },
                    );

                    // Revoke member access to the project channel
                    const channel = bot.channels.cache.get(snapshot.data()["project-channel"]);
                    channel.permissionOverwrites.edit(deletionMember.id, { ViewChannel: false });

                    // Reply
                    await interaction.reply({ content: `Removed ${deletionMember} from "${projectName}"`, ephemeral: true });

                } else {
                    await interaction.reply({ content: `"${projectName}" doesn't exists! Please try again!`, ephemeral: true });
                }

            } catch (error) {
                await interaction.reply({ content: 'Sorry! Something went wrong!', ephemeral: true });
            }
        }
    },
    {
        name: 'demote-project-leader',
        description: 'Removes a leader froms your project (only the project CREATOR can do this)',
        options: [
            {
                name: "project-name",
                description: "The name of your project",
                required: true,
                type: 3,
            },
            {
                name: "leader-name",
                description: "The account of the person you want to add",
                required: true,
                type: 6,
            },
        ],
        onCall: async (interaction) => {
            try {
                const projectName = interaction.options.getString("project-name");
                const deletionMember = interaction.options.getUser("leader-name");
                const snapshot = await db.doc(`Projects/${projectName}`).get();

                if (snapshot.exists) {
                    const hasPermission = snapshot.data()["project-admin"] == interaction.user.id
                    if (!hasPermission) {
                        await interaction.reply({ content: `Nice try but you don't have permission to do that!`, ephemeral: true });
                        return;
                    }

                    // Remove member to members list for project in database
                    await db.doc(`Projects/${projectName}`).update(
                        {
                            "project-leaders": [
                                ...snapshot.data()["project-leaders"].filter(m => m !== deletionMember.id), 
                            ] 
                        },
                    );

                    // Revoke member access to the project channel
                    const channel = bot.channels.cache.get(snapshot.data()["project-channel"]);
                    channel.permissionOverwrites.edit(deletionMember.id, { ViewChannel: false });

                    // Reply
                    await interaction.reply({ content: `Removed ${deletionMember} from "${projectName}"`, ephemeral: true });

                } else {
                    await interaction.reply({ content: `"${projectName}" doesn't exists! Please try again!`, ephemeral: true });
                }

            } catch (error) {
                await interaction.reply({ content: 'Sorry! Something went wrong!', ephemeral: true });
            }
        }
    },
];

async function updateOngoingProjects() {
    const ongoingProjectsChannel = bot.channels.cache.get(ONGOING_PROJECTS_CHANNEL);
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
bot.on('ready', () => { console.log(`Logged in as ${bot.user.tag}!`) });

// Run the onCall function for whatever command was sent
bot.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    commands.forEach(async command => {
        if (command.name === interaction.commandName) 
            command.onCall(interaction);
    })

    await updateOngoingProjects();
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