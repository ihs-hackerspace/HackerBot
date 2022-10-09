export const demoteProjectLeader = {
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
    onCall: async (interaction, db, bot) => {
        try {
            await interaction.deferReply({ ephemeral: true });

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
}