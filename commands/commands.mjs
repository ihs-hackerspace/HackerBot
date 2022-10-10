import { addProjectLeader } from "./addProjectLeader.mjs";
import { addProjectMember } from "./addProjectMember.mjs";
import { approvePurchaseOrder } from "./approvePurchaseOrder.mjs";
import { createNewProject } from "./createNewProject.mjs";
import { demoteProjectLeader } from "./demoteProjectLeader.mjs";
import { denyPurchaseOrder } from "./denyPurchaseOrder.mjs";
import { markProjectComplete } from "./markProjectComplete.mjs";
import { removeProjectMember } from "./removeProjectMember.mjs";
import { requestPurchase } from "./requestPurchase.js";
import { unmarkProjectComplete } from "./unmarkProjectComplete.js";
import { removeProject } from "./removeProject.mjs";

export const commands = [
    addProjectLeader,
    addProjectMember,
    approvePurchaseOrder,
    createNewProject,
    demoteProjectLeader,
    denyPurchaseOrder,
    markProjectComplete,
    removeProjectMember,
    requestPurchase,
    unmarkProjectComplete,
    removeProject,
]