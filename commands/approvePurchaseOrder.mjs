import { ADMIN_ROLE_ID, JOHN_ROLE_ID } from "../constants.mjs";

export const approvePurchaseOrder = {
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
    onCall: async (interaction, db, bot) => {
        try {
            await interaction.deferReply({ ephemeral: true });

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
                
                await interaction.editReply({ content: `Purchase order approved!`, ephemeral: true });
            
            } else {
                await interaction.editReply({ content: `"${orderID}" doesn't exists! Please try again!`, ephemeral: true });
            }

        } catch (error) {
            await interaction.editReply({ content: 'Sorry! Something went wrong!', ephemeral: true });
        }
    }
}