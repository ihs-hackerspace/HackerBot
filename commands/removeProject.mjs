export const removeProject = {
    name: 'remove-project',
    description: 'Delete a project!',
    options: [
        {
            name: "project-name",
            description: "The name of your project",
            required: true,
            type: 3, // https://discord.com/developers/docs/interactions/application-commands#application-command-object-application-command-option-type
        },
    ],
    onCall: async (interaction, db, bot) => {
        try {
            await interaction.deferReply({ ephemeral: true });

            const projectName = interaction.options.getString("project-name").toLowerCase().replaceAll(" ", "-");
            const snapshot = await db.doc(`Projects/${projectName}`).get();

            if (snapshot.exists) {
                const hasPermission = snapshot.data()["project-admin"] == interaction.user.id;
                if (!hasPermission) {
                    await interaction.editReply({ content: `Nice try but you don't have permission to do that!`, ephemeral: true });
                    return;
                }

                // Delete discord channel
                bot.channels.cache.get(snapshot.data()["project-channel"]).delete();

                // Delete database entry
                await db.doc(`Projects/${projectName}`).delete();

                // Reply to the user
                await interaction.editReply({ content: `"${projectName}" deleted!`, ephemeral: true });
                
            } else {
                await interaction.editReply({ content: `"${projectName}" doesn't exists! Please try again!`, ephemeral: true });
            }

        } catch (error) {
            await interaction.editReply({ content: 'Sorry! Something went wrong!', ephemeral: true });
        }
    }
}