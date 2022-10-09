import { YOUR_PROJECTS_CATEGORY } from "../constants.mjs";

export const createNewProject = {
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
    onCall: async (interaction, db) => {
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
}