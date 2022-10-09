import { ADMIN_ROLE_ID, JOHN_ROLE_ID } from "../constants.mjs";


export const denyPurchaseOrder = {
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
    onCall: async (interaction, db) => {
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
                
                await interaction.editReply({ content: `Purchase order denied!`, ephemeral: true });
            
            } else {
                await interaction.editReply({ content: `"${orderID}" doesn't exists! Please try again!`, ephemeral: true });
            }

        } catch (error) {
            await interaction.editReply({ content: 'Sorry! Something went wrong!', ephemeral: true });
        }
    }
}