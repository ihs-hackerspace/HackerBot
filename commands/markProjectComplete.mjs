import { OLD_PROJECTS_CATEGORY } from "../constants.mjs";


export const markProjectComplete = {
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
    onCall: async (interaction, db, bot) => {
        try {
            const projectName = interaction.options.getString("project-name").toLowerCase().replaceAll(" ", "-");
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
}