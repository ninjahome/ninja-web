let __globalCurWalletAddr = null;
let __globalAllCombinedContact = new Map();

function initCurrentDBKey(address) {
    storeDataToLocalStorage(DBKeyLastUsedWallet, address);
}

function getGlobalCurrentAddr() {
    if (!__globalCurWalletAddr) {
        __globalCurWalletAddr = getDataFromLocalStorage(DBKeyLastUsedWallet);
    }
    return __globalCurWalletAddr;
}

/*****************************************************************************************
 *
 *                               account meta
 *
 * *****************************************************************************************/
class accountMeta {
    constructor(nonce, address, name, avatarBase64, balance, updateTime, ethBalance, usdtBalance) {
        this.nonce = nonce;
        this.address = address;
        this.name = name;
        this.avatarBase64 = avatarBase64;
        this.balance = balance;
        this.updateTime = updateTime;
        this.ethBalance = ethBalance;
        this.usdtBalance = usdtBalance;
    }
}

async function queryAvatarData(address) {
    const avatarBase64 = await apiGetMetaAvatar(address);
    if (!avatarBase64) {
        console.log("query avatar raw data failed:", address);
        return null;
    }
    const isDataUri = avatarBase64 && avatarBase64.startsWith('data:application/octet-stream;base64,');
    return isDataUri ? avatarBase64.slice('data:application/octet-stream;base64,'.length) : avatarBase64;
}

async function reloadMetaFromSrv(address) {
    const meta = await apiGetAccountMeta(address)
    if (!meta) {
        return null;
    }
    meta.avatarBase64 = await queryAvatarData(address);
    await dbManager.addOrUpdateData(IndexedDBManager.META_TABLE_NAME, address, meta);
    return meta;
}


/*****************************************************************************************
 *
 *                               contract
 *
 * *****************************************************************************************/

class contactItem {
    constructor(address, alias, remark) {
        this.address = address;
        this.alias = alias;
        this.remark = remark;
    }

    static fromJson(json) {
        return new contactItem(json.address, json.alias, json.remark);
    }
}

class combinedContact {
    constructor(meta, contact) {
        this.meta = meta;
        this.contact = contact;
    }
}

function getCombinedContactByAddress(address) {
    return __globalAllCombinedContact.get(address)
}

async function initAllContactWithDetails(forceReload = false) {

    if (__globalAllCombinedContact.size > 0 && !forceReload) {
        return __globalAllCombinedContact;
    }

    __globalAllCombinedContact = new Map();

    let contactList = await dbManager.getAllData(IndexedDBManager.CONTACT_TABLE_NAME);

    if (forceReload || !contactList) {
        contactList = await apiLoadContactListFromServer(getGlobalCurrentAddr());
        if (contactList){
            await dbManager.clearAndFillTable(IndexedDBManager.CONTACT_TABLE_NAME, contactList)
        }
    }

    if (!contactList) {
        return __globalAllCombinedContact;
    }

    for (const contactData of contactList) {
        const contact = contactItem.fromJson(contactData)
        const address = contact.address
        let meta = await dbManager.getData(IndexedDBManager.META_TABLE_NAME, address);
        const cc = new combinedContact(meta, contact);
        __globalAllCombinedContact.set(address, cc);
        if (!meta) {
            reloadMetaFromSrv(address).then(r => {
                console.log("reload meta from server success", address);
                cc.meta = r;
            })
        }
    }

    return __globalAllCombinedContact;
}

/*****************************************************************************************
 *
 *                               self details
 *
 * *****************************************************************************************/

async function loadSelfDetails(walletObj, force) {
    const address = getGlobalCurrentAddr();
    let meta = await dbManager.getData(IndexedDBManager.META_TABLE_NAME, address)
    if (!force && meta) {
        return meta;
    }

    meta = await apiGetAccountMeta(getGlobalCurrentAddr())
    if (!meta) {
        return new accountMeta(-1, walletObj.address, "",
            null, 0, 0, 0.0, 0.0);
    }
    meta.avatarBase64 = await queryAvatarData(address);
    const eth = await apiWeb3EthBalance(walletObj.EthAddrStr());
    meta.ethBalance = eth[0];
    meta.usdtBalance = eth[1];

    await dbManager.addOrUpdateData(IndexedDBManager.META_TABLE_NAME, address, meta);
    return meta;
}

/*****************************************************************************************
 *
 *                               message tips
 *
 * *****************************************************************************************/
class messageTipsToShow {
    constructor(tips, meta) {
        this.tips = tips;
        this.meta = meta;
    }
}

class messageTipsItem {
    constructor(address, time, description) {
        this.address = address;
        this.time = time;
        this.description = description;
    }
}

async function cacheSyncCachedMsgTipsToDb(address, item) {
    await dbManager.addOrUpdateData(IndexedDBManager.MSG_TIP_TABLE_NAME,address, item);
}
async function removeCachedMsgTipsFromDb(address){
    await dbManager.deleteData(IndexedDBManager.MSG_TIP_TABLE_NAME, address);
}

async function cacheLoadCachedMsgTipsList() {
    const result = new Map();

    const arrays = await dbManager.getAllData(IndexedDBManager.MSG_TIP_TABLE_NAME)
    for (const item of arrays){
        result.set(item.address, item);
    }

    return result;
}

async function wrapToShowAbleMsgTipsList(data) {
    const result = [];
    for (const [key, value] of data) {
        const meta = await dbManager.getData(IndexedDBManager.META_TABLE_NAME, key);
        const item = new messageTipsToShow(value, meta);
        result.push(item);
    }
    result.sort((a, b) => b.time - a.time);
    return result;
}

/*****************************************************************************************
 *
 *                               message item;
 *
 * *****************************************************************************************/

class showAbleMsgItem {
    constructor(isSelf, avatarBase64, nickname, msgPayload, time) {
        this.isSelf = isSelf;
        this.avatarBase64 = avatarBase64;
        this.nickname = nickname;
        this.msgPayload = msgPayload;
        this.time = time;
    }
}

class msgPayLoad {
    constructor(typ, txt, data) {
    }
}

class storedMsgItem {
    constructor(mid, from, to, payload, isGrp) {
    }
}

function cacheLoadCachedMsgListForAddr(address) {

    const result = [];

    const currentDate = new Date();
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(currentDate.getDate() - 2);

    const msg_1 = new showAbleMsgItem(true, null, "中本聪", "早上好", twoDaysAgo);
    const msg_2 = new showAbleMsgItem(false, null, "日本聪", "您好！很开心和您聊天😊", twoDaysAgo);
    const msg_3 = new showAbleMsgItem(true, null, "中本聪", "最近项目的进展咋样？", currentDate);
    const msg_4 = new showAbleMsgItem(false, null, "日本聪", "项目进展顺利项\r\n目进展顺利\r\n项目进展顺利项目进展顺利项目进展顺利项目进展顺利项目进展顺利，我们在使用新的技术编程", currentDate);

    result.push(msg_1);
    result.push(msg_2);
    result.push(msg_3);
    result.push(msg_4);
    return result;
}