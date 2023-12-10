function togglePanels(button, panelToShow) {
    document.getElementById('messageControlPanel').style.display = 'none';
    document.getElementById('friendControlPanel').style.display = 'none';
    document.getElementById('settingsMenu').style.display = 'none';

    document.getElementById('messageContentArea').style.display = 'none';
    document.getElementById('contactContentArea').style.display = 'none';
    document.getElementById('settingContentArea').style.display = 'none';

    document.getElementById('accountSettingContentArea').style.visibility = 'hidden';

    document.getElementById(panelToShow).style.display = 'block';
    toggleButton(button);
}

function toggleButton(button) {
    const buttons = document.querySelectorAll('.button');
    buttons.forEach(b => b.classList.remove('selected'));

    if (!button) {
        button = buttons[0];
    }
    button.classList.add('selected');
}

function logout() {
    quitFromSession();
}

function clearCallLocalCache() {
    openDialog(resetCache, "该操作请清空所有数据，包括账号，请确保账号已经保存");
}

let selfAccountInfo = null;

function selfAccountSettings() {
    loadSelfDetails(curWalletObj, true).then(result => {

        document.getElementById('settingContentArea').style.display = 'block';
        document.getElementById('accountSettingContentArea').style.visibility = 'visible';
        if (result.avatarBase64) {
            document.getElementById('avatarImage').src = "data:image/png;base64," + result.avatarBase64;
        } else {
            document.getElementById('avatarImage').src = DefaultAvatarUrl;
        }
        document.getElementById('blockchainAddress').innerText = curWalletObj.address;
        document.getElementById('nickname').innerText = result.name;
        document.getElementById('expireDays').innerText = calculateDays(result.balance) + ' 天';
        document.getElementById('ethAddress').innerText = curWalletObj.EthAddrStr();
        document.getElementById('ethBalance').innerText = result.ethBalance + ' ETH';
        document.getElementById('usdtBalance').innerText = result.usdtBalance + ' USDT';
        selfAccountInfo = result;
    }).catch(err => {
        console.log(err)
        showModal("查询账号信息失败:" + err);
    });
}

Handlebars.registerHelper('formatTime', function (time) {
    const currentDate = new Date();
    const messageDate = new Date(time);
    const timeDiff = currentDate - messageDate;

    if (timeDiff > 24 * 60 * 60 * 1000) {
        const day = messageDate.getDate();
        const month = messageDate.getMonth() + 1; // Month is zero-based
        const year = messageDate.getFullYear().toString().slice(-2); // Get last two digits of the year
        return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
    } else {
        const minutes = messageDate.getUTCMinutes();
        const hours = messageDate.getHours();
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }
});

class IMManager {
    constructor() {
        this.socket = null;
    }

    getAddress() {
        return curWalletObj.address;
    }

    newPeerMsg(data) {
        console.log("got new mssg");
    }

    SocketClosed() {
        showModal("聊天链接断开:");
    }

    SocketError(err) {
        showModal("聊天链接异常:" + err);
    }

    SignData(data) {
        return curWalletObj.SignRawData(data);
    }

    OnlineResult(err) {
        if (!err) {
            console.log("online success!");
            return;
        }
        showModal("online failed");
    }
}

let cachedMsgTipMap = new Map();
let curWalletObj = null;
let curMsgManager = new IMManager();
document.addEventListener("DOMContentLoaded", async function () {
    await dbManager.openDatabase()
    checkSessionKeyPriKey();
    window.addEventListener('popstate', function () {
        clearSessionStorage();
    })

    initModal().then(async response => {
        cachedMsgTipMap = await cacheLoadCachedMsgTipsList();
        refreshMsgTipsList().then(r=>{
        });
        loadCombinedContacts(false);
        wsOnline(curMsgManager).then(s => {
            curMsgManager.socket = s;
        });
        initMsgSender();
    });

    togglePanels(null, 'messageControlPanel', 'messageContentArea');
    document.getElementById('msgSearchInput').addEventListener('keyup', function (event) {
        if (event.key === 'Enter') {
            searchAccountMetaByAddress().then(r => {
                showSearchedAccountMeta(r);
            });
        }
    });
});

window.addEventListener('beforeunload', () => {
    dbManager.closeDatabase(); // 在页面卸载前关闭数据库连接
});

function showSearchedAccountMeta(meta) {
    if (!meta) {
        return;
    }

    const popup = document.getElementById('searchedMetaPopupDialog');
    // 显示弹出窗口
    popup.style.display = 'flex';

    if (meta.avatarBase64) {
        document.getElementById("searchedUsrAvatar").src = "data:image/png;base64," + meta.avatarBase64;
    } else {
        document.getElementById("contactAvatarImage").src = DefaultAvatarUrl;
    }

    const expireDays = calculateDays(meta.balance)
    document.getElementById("searchedUsrBasicInfo").innerHTML = `
        <span>昵称：${meta.name}</span>
        <p>地址：${meta.address}</p>
        <p>余额: ${expireDays} 天</p>
    `;

    const buttonRow = document.querySelector("#searchedMetaPopupDialog .user-info-button-row");
    if (meta.address === curWalletObj.address) {
        buttonRow.innerHTML = `
        <button onclick="closePopup()">关闭</button>
    `
        return
    }

    buttonRow.innerHTML = `
        <button onclick="startChatWithFriend('${meta.address}', closePopup)">开始聊天</button>
        <button onclick="closePopup()">关闭</button>
    `
}

// 关闭弹出窗口的函数
function closePopup() {
    const popup = document.getElementById('searchedMetaPopupDialog');
    popup.style.display = 'none';
}

async function searchAccountMetaByAddress() {
    const msgSearchInput = document.getElementById('msgSearchInput');
    const blockchainAddress = msgSearchInput.value.trim();
    msgSearchInput.value = '';
    if (!isBlockchainAddress(blockchainAddress)) {
        showModal("不是有效的Ninja地址");
        return null;
    }
    console.log('用户输入的地址:', blockchainAddress);
    let meta = await dbManager.getData(IndexedDBManager.META_TABLE_NAME, blockchainAddress);

    reloadMetaFromSrv(blockchainAddress).then(r => {
        showSearchedAccountMeta(r);
    })
    if (!meta) {
        return new accountMeta(-1, blockchainAddress, "", null, 0, 0)
    }
    return meta;
}

function isBlockchainAddress(address) {
    return address.toLowerCase().startsWith('nj');
}

function initMsgSender() {
    const messageInput = document.getElementById('messageInput');
    // Event listener for Enter key
    messageInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault(); // Prevent the newline
            sendMessage().then(r => {
                console.log("send message success");
            });
        }
    });

    // Event listener for Shift+Enter to insert newline
    messageInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && event.shiftKey) {
            // Do nothing or add newline logic
        }
    });
}

async function sendMessage() {
    const messageContainer = document.getElementById('messageContainer');
    const messageInput = document.getElementById('messageInput');
    const messageText = messageInput.value;
    if (messageText.trim() === '') {
        return;
    }
    if (!selfAccountInfo) {
        selfAccountInfo = await loadSelfDetails(curWalletObj, true);
    }

    const message = new showAbleMsgItem(true, selfAccountInfo.avatarBase64,
         selfAccountInfo.name, messageText, new Date());

    const divItem = document.createElement('div');
    divItem.classList.add('messageItem', 'self');

    const messageTemplate = Handlebars.compile(document.getElementById('messageTemplate').innerHTML);
    divItem.innerHTML = messageTemplate({messages: [message]});

    messageContainer.appendChild(divItem);
    messageInput.value = '';
}

function checkSessionKeyPriKey() {
    const keyData = getDataFromSessionStorage(SessionKeyCurWalletObj);
    if (!keyData) {
        window.location.href = "/";
    }
    curWalletObj = new LightSubKey(keyData.light, keyData.id, keyData.address, Object.values(keyData.privateKey));
    loadSelfDetails(curWalletObj, true).then(r => {
        console.log("load self contact detail success");
        selfAccountInfo = r;
    });
}

// 清空 sessionStorage
function clearSessionStorage() {
    sessionStorage.clear();
    curWalletObj = null;
}

let lastSelectedMsgItem = null;

function loadCachedMsgListForAddr(item, address) {
    document.getElementById("messageContentArea").style.display = 'block';
    if (lastSelectedMsgItem) {
        lastSelectedMsgItem.classList.remove('selected');
    }
    item.classList.add('selected');
    lastSelectedMsgItem = item;

    const messages = cacheLoadCachedMsgListForAddr(address);
    const messageTemplate = Handlebars.compile(document.getElementById('messageTemplate').innerHTML);
    document.getElementById('messageContainer').innerHTML = messageTemplate({messages});
    document.getElementById('blockchainAddressOfPeer').innerText = address
}


async function refreshMsgTipsList() {
    const source = document.getElementById("messageTipsListTemplate").innerHTML;
    const template = Handlebars.compile(source);
    const messages = await wrapToShowAbleMsgTipsList(cachedMsgTipMap);
    document.getElementById("messageTipsList").innerHTML = template({messages: messages});
}

function removeMsgTipsItem(event,address) {
    console.log("start to remove this item=>",address);
    event.stopPropagation();
    cachedMsgTipMap.delete(address);
    removeCachedMsgTipsFromDb(address).then(r=>{
        refreshMsgTipsList().then(r=>{});
    });
}

function clearCachedMsg() {
    window.location.reload();
}

function loadCombinedContacts(force) {
    initAllContactWithDetails(force).then(friends => {
        const valuesArray = Array.from(friends.values());
        const source = document.getElementById("friendListTemplate").innerHTML;
        const template = Handlebars.compile(source);
        document.getElementById("friendList").innerHTML = template({friends: valuesArray});
        if (force) {
            showModal("好友列表更新成功！");
        }
    }).catch(error => {
        showModal("加载好友列表失败：" + error);
    });
}

let lastSelectedFriendItem = null;

async function fullFillContact(item, address) {
    if (lastSelectedFriendItem) {
        lastSelectedFriendItem.classList.remove('selected');
    }
    item.classList.add('selected');
    lastSelectedFriendItem = item;
    const contactInfo = getCombinedContactByAddress(address)
    if (!contactInfo) {
        return;
    }

    document.getElementById('contactContentArea').style.display = 'flex';
    let meta = contactInfo.meta;
    if (!meta) {
        meta = await reloadMetaFromSrv(address);
        if (!meta) {
            meta = new accountMeta(-1, address, '', null, 0, 0, 0, 0,)
        }
    }
    if (meta.avatarBase64) {
        document.getElementById("contactAvatarImage").src = "data:image/png;base64," + meta.avatarBase64;
        document.getElementById("contact-avatar-" + address).src = "data:image/png;base64," + meta.avatarBase64;
    } else {
        document.getElementById("contactAvatarImage").src = DefaultAvatarUrl;
    }

    const expireDays = calculateDays(meta.balance)
    document.getElementById("contactInfoContainer").innerHTML = `
        <span>昵称：${meta.name}</span>
        <p>地址：${meta.address}</p>
        <p>别名: ${contactInfo.contact.alias}</p>
        <p>备注: ${contactInfo.contact.remark}</p>
        <p>余额: ${expireDays} 天</p>
    `;

    const buttonRow = document.querySelector("#contactContentArea .button-row");
    buttonRow.innerHTML = `
        <button onclick="startChatWithFriend('${meta.address}', null)">开始聊天</button>
        <button onclick="deleteFriend('${meta.address}')">删除好友</button>
    `;
}

async function startChatWithFriend(address, callback) {

    let msgTipItem = cachedMsgTipMap.get(address);
    if (!msgTipItem) {
        msgTipItem = new messageTipsItem(address, new Date(), "开始聊天");
        cachedMsgTipMap.set(address, msgTipItem);
        cacheSyncCachedMsgTipsToDb(address, msgTipItem).then(r => {
        });
        await refreshMsgTipsList();
    }

    const btn = document.getElementById("messageButton");
    togglePanels(btn, 'messageControlPanel');
    const liElement = document.querySelector('li[data-address="' + address + '"]');
    loadCachedMsgListForAddr(liElement, address);
    if (callback) {
        callback();
    }
}

function deleteFriend(contact) {
    console.log("start to delete friend:", contact);
}

function exportWallet(keyString, password) {
    saveDataToDisk(keyString, 'ninja_wallet.json');
}

function removeWallet(keyString, password) {
    dbManager.deleteData(IndexedDBManager.WALLET_TABLE_NAME, curWalletObj.address).then(r => {
        window.location.href = '/';
    })
}