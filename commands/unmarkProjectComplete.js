import { YOUR_PROJECTS_CATEGORY } from "../constants.mjs";

export const unmarkProjectComplete = {
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
    onCall: async (interaction, db) => {
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
}