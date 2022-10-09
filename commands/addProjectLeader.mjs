export const addProjectLeader = {
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
    onCall: async (interaction, db) => {
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
}