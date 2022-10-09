export const YOUR_PROJECTS_CATEGORY = "1028394596352409691"
export const OLD_PROJECTS_CATEGORY = "1028440069868113951";
export const ONGOING_PROJECTS_CHANNEL = "1028375365577605140";
export const PURCHASE_ORDERS_CHANNEL = "1028690748499046530";

export const ADMIN_ROLE_ID = "1028370438981685278"
export const JOHN_ROLE_ID = "1028370737087655966"

export function generateUUID() {
    let d = new Date().getTime(), d2 = (performance && performance.now && (performance.now() * 1000)) || 0;
    return 'xyxxy-xxxxy'.replace(/[xy]/g, c => {
        let r = Math.random() * 16;
        if (d > 0) {
            r = (d + r) % 16 | 0;
            d = Math.floor(d / 16);
        } else {
            r = (d2 + r) % 16 | 0;
            d2 = Math.floor(d2 / 16);
        }
        return (c == 'x' ? r : (r & 0x7 | 0x8)).toString(16);
    });
};