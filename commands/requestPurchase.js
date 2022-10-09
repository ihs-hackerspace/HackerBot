import { PURCHASE_ORDERS_CHANNEL, generateUUID } from "../constants.mjs";

export const requestPurchase = {
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
    onCall: async (interaction, db, bot) => {
        try {
            await interaction.deferReply({ ephemeral: true });

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
}