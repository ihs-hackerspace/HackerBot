const { Client, GatewayIntentBits, REST, Routes, ChannelType, PermissionsBitField, } = require('discord.js');
const { BOT_TOKEN, CLIENT_ID, FIREBASE_AUTH } = require('./config')
const bot = new Client({ intents: [GatewayIntentBits.Guilds] });
const rest = new REST({ version: '10' }).setToken(BOT_TOKEN);

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
initializeApp({ credential: cert(FIREBASE_AUTH) });
const db = getFirestore();

const YOUR_PROJECTS_CATEGORY = "1028394596352409691"
const OLD_PROJECTS_CATEGORY = "1028440069868113951";
const ONGOING_PROJECTS_CHANNEL = "1028375365577605140";
const PURCHASE_ORDERS_CHANNEL = "1028690748499046530";

const ADMIN_ROLE_ID = "1028370438981685278"
const JOHN_ROLE_ID = "1028370737087655966"

let ProjectsWidget;

const commands = [
    {
        name: 'create-new-project',
        description: 'Create a new project and memebers who wish to work on the project!',
        options: [
            {
                name: "project-name",
                description: "The name of your new project",
                required: true,
                type: 3, // https://discord.com/developers/docs/interactions/application-commands#application-command-object-application-command-option-type
            },
            {
                name: "project-description",
                description: "The description of your new project",
                required: true,
                type: 3, // https://discord.com/developers/docs/interactions/application-commands#application-command-object-application-command-option-type
            },
        ],
        onCall: async (interaction) => {
            try {
                await interaction.deferReply();

                const projectName = interaction.options.getString("project-name").toLowerCase().replaceAll(" ", "-");
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
                        'project-channel': channel.id,
                        'start-date': new Date(),
                        'purchase-orders': []
                    });

                    // Reply to the user
                    await interaction.editReply({ content: `"${projectName}" created`, ephemeral: true });
                    
                } else {
                    await interaction.editReply({ content: `Please choose a new name! "${projectName}" already exists`, ephemeral: true });
                }

            } catch (error) {
                await interaction.editReply({ content: 'Sorry! Something went wrong!', ephemeral: true });
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
                type: 3, // https://discord.com/developers/docs/interactions/application-commands#application-command-object-application-command-option-type
            },
        ],
        onCall: async (interaction) => {
            try {
                await interaction.deferReply();

                const projectName = interaction.options.getString("project-name").toLowerCase().replaceAll(" ", "-");
                const snapshot = await db.doc(`Projects/${projectName}`).get();
    
                if (snapshot.exists) {
                    const hasPermission = snapshot.data()["project-leaders"].includes(interaction.user.id);
                    if (!hasPermission) {
                        await interaction.editReply({ content: `Nice try but you don't have permission to do that!`, ephemeral: true });
                        return;
                    }

                    const channel = bot.channels.cache.get(snapshot.data()["project-channel"]);
                    channel.setParent(OLD_PROJECTS_CATEGORY);
                    await db.doc(`Projects/${projectName}`).update(({ ongoing: false }));
                } else {
                    await interaction.editReply({ content: `"${projectName}" doesn't exists! Please try again!`, ephemeral: true });
                }
    
            } catch (error) {
                await interaction.editReply({ content: 'Project completed! Good Job!', ephemeral: true });
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
                type: 3, // https://discord.com/developers/docs/interactions/application-commands#application-command-object-application-command-option-type
            },
        ],
        onCall: async (interaction) => {
            try {
                await interaction.deferReply();

                const projectName = interaction.options.getString("project-name").toLowerCase().replaceAll(" ", "-");
                const snapshot = await db.doc(`Projects/${projectName}`).get();
    
                if (snapshot.exists) {
                    const hasPermission = snapshot.data()["project-leaders"].includes(interaction.user.id);
                    if (!hasPermission) {
                        await interaction.editReply({ content: `Nice try but you don't have permission to do that!`, ephemeral: true });
                        return;
                    }

                    const channel = bot.channels.cache.get(snapshot.data()["project-channel"]);
                    channel.setParent(YOUR_PROJECTS_CATEGORY);
                    await db.doc(`Projects/${projectName}`).update(({ ongoing: true }));
                    await interaction.editReply({ content: 'Projected revived!', ephemeral: true });
                } else {
                    await interaction.editReply({ content: `"${projectName}" doesn't exists! Please try again!`, ephemeral: true });
                }
    
            } catch (error) {
                await interaction.editReply({ content: 'Sorry! Something went wrong!', ephemeral: true });
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
                type: 3, // https://discord.com/developers/docs/interactions/application-commands#application-command-object-application-command-option-type
            },
            {
                name: "member-name",
                description: "The account of the person you want to add",
                required: true,
                type: 6, // https://discord.com/developers/docs/interactions/application-commands#application-command-object-application-command-option-type
            },  
        ],
        onCall: async (interaction) => {
            try {
                await interaction.deferReply();

                const projectName = interaction.options.getString("project-name").toLowerCase().replaceAll(" ", "-");
                const newMember = interaction.options.getUser("member-name");
                const snapshot = await db.doc(`Projects/${projectName}`).get();

                if (snapshot.exists) {
                    const hasPermission = snapshot.data()["project-leaders"].includes(interaction.user.id) || snapshot.data()["project-admin"] == interaction.user.id;
                    if (!hasPermission) {
                        await interaction.editReply({ content: `Nice try but you don't have permission to do that!`, ephemeral: true });
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
                    await interaction.editReply({ content: `Added ${newMember} to "${projectName}"`, ephemeral: true });

                } else {
                    await interaction.editReply({ content: `"${projectName}" doesn't exists! Please try again!`, ephemeral: true });
                }

            } catch (error) {
                await interaction.editReply({ content: 'Sorry! Something went wrong!', ephemeral: true });
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
                type: 3, // https://discord.com/developers/docs/interactions/application-commands#application-command-object-application-command-option-type
            },
            {
                name: "leader-name",
                description: "The account of the person you want to add",
                required: true,
                type: 6, // https://discord.com/developers/docs/interactions/application-commands#application-command-object-application-command-option-type
            },
        ],
        onCall: async (interaction) => {
            try {
                await interaction.deferReply();

                const projectName = interaction.options.getString("project-name").toLowerCase().replaceAll(" ", "-");
                const newMember = interaction.options.getUser("leader-name");
                const snapshot = await db.doc(`Projects/${projectName}`).get();

                if (snapshot.exists) {
                    const hasPermission = snapshot.data()["project-admin"] == interaction.user.id;
                    if (!hasPermission) {
                        await interaction.editReply({ content: `Nice try but you don't have permission to do that!`, ephemeral: true });
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
                    await interaction.editReply({ content: `Added ${newMember} to "${projectName}"`, ephemeral: true });

                } else {
                    await interaction.editReply({ content: `"${projectName}" doesn't exists! Please try again!`, ephemeral: true });
                }

            } catch (error) {
                await interaction.editReply({ content: 'Sorry! Something went wrong!', ephemeral: true });
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
                type: 3, // https://discord.com/developers/docs/interactions/application-commands#application-command-object-application-command-option-type
            },
            {
                name: "member-name",
                description: "The account of the person you want to remove",
                required: true,
                type: 6, // https://discord.com/developers/docs/interactions/application-commands#application-command-object-application-command-option-type
            },
        ],
        onCall: async (interaction) => {
            try {
                await interaction.deferReply();

                const projectName = interaction.options.getString("project-name").toLowerCase().replaceAll(" ", "-");
                const deletionMember = interaction.options.getUser("member-name");
                const snapshot = await db.doc(`Projects/${projectName}`).get();

                if (snapshot.exists) {
                    const hasPermission = snapshot.data()["project-leaders"].includes(interaction.user.id) || snapshot.data()["project-admin"] == interaction.user.id;
                    if (!hasPermission) {
                        await interaction.editReply({ content: `Nice try but you don't have permission to do that!`, ephemeral: true });
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
                    await interaction.editReply({ content: `Removed ${deletionMember} from "${projectName}"`, ephemeral: true });

                } else {
                    await interaction.editReply({ content: `"${projectName}" doesn't exists! Please try again!`, ephemeral: true });
                }

            } catch (error) {
                await interaction.editReply({ content: 'Sorry! Something went wrong!', ephemeral: true });
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
                type: 3, // https://discord.com/developers/docs/interactions/application-commands#application-command-object-application-command-option-type
            },
            {
                name: "leader-name",
                description: "The account of the person you want to add",
                required: true,
                type: 6, // https://discord.com/developers/docs/interactions/application-commands#application-command-object-application-command-option-type
            },
        ],
        onCall: async (interaction) => {
            try {
                await interaction.deferReply();

                const projectName = interaction.options.getString("project-name").toLowerCase().replaceAll(" ", "-");
                const deletionMember = interaction.options.getUser("leader-name");
                const snapshot = await db.doc(`Projects/${projectName}`).get();

                if (snapshot.exists) {
                    const hasPermission = snapshot.data()["project-admin"] == interaction.user.id
                    if (!hasPermission) {
                        await interaction.editReply({ content: `Nice try but you don't have permission to do that!`, ephemeral: true });
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
                    await interaction.editReply({ content: `Removed ${deletionMember} from "${projectName}"`, ephemeral: true });

                } else {
                    await interaction.editReply({ content: `"${projectName}" doesn't exists! Please try again!`, ephemeral: true });
                }

            } catch (error) {
                await interaction.editReply({ content: 'Sorry! Something went wrong!', ephemeral: true });
            }
        }
    },



    {
        name: 'request-purchase',
        description: 'For when you need to use our money to purchase something',
        options: [
            {
                name: "project-name",
                description: "The name of your project",
                required: true,
                type: 3, // https://discord.com/developers/docs/interactions/application-commands#application-command-object-application-command-option-type
            },
            {
                name: "item-name",
                description: "Name of item",
                required: true,
                type: 3, // https://discord.com/developers/docs/interactions/application-commands#application-command-object-application-command-option-type
            },
            {
                name: "quantity",
                description: "Quantity of item",
                required: true,
                type: 4, // https://discord.com/developers/docs/interactions/application-commands#application-command-object-application-command-option-type
            },
            {
                name: "total-cost",
                description: "Total cost with tax and shipping",
                required: true,
                type: 10, // https://discord.com/developers/docs/interactions/application-commands#application-command-object-application-command-option-type
            },
            {
                name: "reason",
                description: "Why do you need it?",
                required: true,
                type: 3, // https://discord.com/developers/docs/interactions/application-commands#application-command-object-application-command-option-type
            },
            {
                name: "link",
                description: "Link to where you want it to be purchased from",
                required: true,
                type: 3, // https://discord.com/developers/docs/interactions/application-commands#application-command-object-application-command-option-type
            },
        ],
        onCall: async (interaction) => {
            try {
                await interaction.deferReply();

                const projectName = interaction.options.getString("project-name").toLowerCase().replaceAll(" ", "-");
                const projectSnapshot = await db.doc(`Projects/${projectName}`).get();

                if (projectSnapshot.exists) {
                    const hasPermission = projectSnapshot.data()["project-leaders"].includes(interaction.user.id);
                    if (!hasPermission) {
                        await interaction.editReply({ content: `Nice try but you don't have permission to do that!`, ephemeral: true });
                        return;
                    }

                    const ticketID = generateUUID();

                    const orderTicket = {
                        'project-name': projectName,
                        'ticket-id': ticketID,
                        'item-name': interaction.options.getString("item-name"),
                        'quantity': interaction.options.getInteger("quantity"),
                        'reason': interaction.options.getString("reason"),
                        'href': interaction.options.getString("link"),
                        'total-cost': interaction.options.getNumber("total-cost"),
                        'message-id': interaction.id,
                        'approved': false,
                    }

                    await db.doc(`Orders/${ticketID}`).set(orderTicket);
                    await db.doc(`Projects/${projectName}`).update(({ 
                        'purchase-orders': [
                            ...projectSnapshot.data()['purchase-orders'],
                            ticketID
                        ]
                    }));

                    bot.channels.cache.get(PURCHASE_ORDERS_CHANNEL).send(
                        `
                            > **New Purchase Order (${ticketID})**
                            > 
                            > Project: ${orderTicket["project-name"]}
                            > Item: ${orderTicket["item-name"]}
                            > Quantity: ${orderTicket["quantity"]}
                            > Reason: ${orderTicket["reason"]}
                            > 
                            > Link: <${orderTicket["href"]}>
                        `
                    );

                    await interaction.editReply({ content: `Purchase order recieved! Your order id is "${ticketID}"` });
                
                } else {
                    await interaction.editReply({ content: `"${projectName}" doesn't exists! Please try again!`, ephemeral: true });
                }
    
            } catch (error) {
                await interaction.editReply({ content: 'Sorry! Something went wrong!', ephemeral: true });
            }
        }
    },



    {
        name: 'approve-purchase-order',
        description: 'For admins to approve purchases',
        options: [
            {
                name: "order-id",
                description: "ID of the purchase order",
                required: true,
                type: 3, // https://discord.com/developers/docs/interactions/application-commands#application-command-object-application-command-option-type
            },
            {
                name: "notes",
                description: "Important notes",
                required: false,
                type: 3, // https://discord.com/developers/docs/interactions/application-commands#application-command-object-application-command-option-type
            },
        ],
        onCall: async (interaction) => {
            try {
                await interaction.deferReply();

                const orderID = interaction.options.getString("order-id");
                const orderSnapshot = await db.doc(`Orders/${orderID}`).get();

                if (orderSnapshot.exists) {
                    const hasPermission = interaction.member.roles.cache.has(ADMIN_ROLE_ID) || interaction.member.roles.cache.has(JOHN_ROLE_ID);
                    if (!hasPermission) {
                        await interaction.editReply({ content: `Nice try but you don't have permission to do that!`, ephemeral: true });
                        return;
                    }

                    const orderTicket = orderSnapshot.data();
                    const projectSnapshot = await db.doc(`Projects/${orderTicket["project-name"]}`).get();
                    
                    if (orderTicket["approved"]) {
                        await interaction.editReply({ content: `Already approved!`, ephemeral: true });
                        return;
                    }

                    await db.doc(`Orders/${orderID}`).update({ "approved": true });
                    await db.doc(`Projects/${orderTicket["project-name"]}`).update({ 
                        "running-cost" : projectSnapshot.data()["running-cost"] + orderTicket["total-cost"]
                    });

                    bot.channels.cache.get(projectSnapshot.data()["project-channel"]).send(
                        `
                            > **Approved (${orderID})**
                            > 
                            > Item: ${orderTicket["item-name"]}
                            > Quantity: ${orderTicket["quantity"]}
                            > Link: <${orderTicket["href"]}>
                            > 
                            > Notes: ${interaction.options.getString("notes")}
                        `
                    );
                    
                    await interaction.editReply({ content: `Purchase order approved!` });
                
                } else {
                    await interaction.editReply({ content: `"${orderID}" doesn't exists! Please try again!`, ephemeral: true });
                }
    
            } catch (error) {
                await interaction.editReply({ content: 'Sorry! Something went wrong!', ephemeral: true });
            }
        }
    },


    {
        name: 'deny-purchase-order',
        description: 'For admins to deny purchases',
        options: [
            {
                name: "order-id",
                description: "ID of the purchase order",
                required: true,
                type: 3, // https://discord.com/developers/docs/interactions/application-commands#application-command-object-application-command-option-type
            },
            {
                name: "reason",
                description: "Important notes",
                required: true,
                type: 3, // https://discord.com/developers/docs/interactions/application-commands#application-command-object-application-command-option-type
            },
        ],
        onCall: async (interaction) => {
            try {
                const orderID = interaction.options.getString("order-id");
                const orderSnapshot = await db.doc(`Orders/${orderID}`).get();

                if (orderSnapshot.exists) {
                    const hasPermission = interaction.member.roles.cache.has(ADMIN_ROLE_ID) || interaction.member.roles.cache.has(JOHN_ROLE_ID);
                    if (!hasPermission) {
                        await interaction.editReply({ content: `Nice try but you don't have permission to do that!`, ephemeral: true });
                        return;
                    }

                    bot.channels.cache.get(projectSnapshot.data()["project-channel"]).send(
                        `
                            > **Denied (${orderID})**
                            > 
                            > Item: ${orderTicket["item-name"]}
                            > Quantity: ${orderTicket["quantity"]}
                            > Link: <${orderTicket["href"]}>
                            > 
                            > Reason: ${interaction.options.getString("reason")}
                        `
                    );
                    
                    await interaction.editReply({ content: `Purchase order denied!` });
                
                } else {
                    await interaction.editReply({ content: `"${orderID}" doesn't exists! Please try again!`, ephemeral: true });
                }
    
            } catch (error) {
                await interaction.editReply({ content: 'Sorry! Something went wrong!', ephemeral: true });
            }
        }
    },
];

function toTitleCase(str) {
    return str
        .replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase())
        .replaceAll("-", " ");
}

function differenceOfDays(date1, date2) {
    const oneDay = 1000 * 60 * 60 * 24;
    const diffInTime = date2.getTime() - date1.getTime();
    const diffInDays = Math.round(diffInTime / oneDay);
    return diffInDays;
}

function generateUUID() {
    let d = new Date().getTime(), d2 = (performance && performance.now && (performance.now() * 1000)) || 0;
    return 'xyxxy-xxxxy'.replace(/[xy]/g, c => {
        let r = Math.random() * 16;
        if (d > 0) {
            r = (d + r) % 16 | 0;
            d = Math.floor(d / 16);
        } else {
            r = (d2 + r) % 16 | 0;
            d2 = Math.floor(d2 / 16);
        }
        return (c == 'x' ? r : (r & 0x7 | 0x8)).toString(16);
    });
  };

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
                snapshot.docs.map((doc) => {
                    const project = doc.data();
                    if (project["ongoing"]) {
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
            await command.onCall(interaction);
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