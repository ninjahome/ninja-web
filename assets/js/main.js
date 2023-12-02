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
        if (result.meta.avatarBase64) {
            document.getElementById('avatarImage').src = "data:image/png;base64," + result.meta.avatarBase64;
        } else {
            document.getElementById('avatarImage').src = '/assets/logo.png';
        }
        document.getElementById('blockchainAddress').innerText = curWalletObj.address;
        document.getElementById('nickname').innerText = result.meta.name;
        document.getElementById('expireDays').innerText = calculateDays(result.meta.balance) + ' 天';
        document.getElementById('ethAddress').innerText = curWalletObj.EthAddrStr();
        document.getElementById('ethBalance').innerText = result.ethBalance + ' ETH';
        document.getElementById('usdtBalance').innerText = result.usdeBalance + ' USDT';
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

let curWalletObj = null;
let curMsgManager = new IMManager();
document.addEventListener("DOMContentLoaded", function () {
    checkSessionKeyPriKey();
    window.addEventListener('popstate', function () {
        clearSessionStorage();
    })

    initModal().then(response => {
        loadCachedMsgTipsList();
        loadCombinedContacts(false);
        curMsgManager.socket = wsOnline(curMsgManager);
        initMsgSender();
    });

    togglePanels(null, 'messageControlPanel', 'messageContentArea');
    document.getElementById('msgSearchInput').addEventListener('keyup', function(event) {
        if (event.key === 'Enter') {
            // 用户按下回车键
            handleEnterKeyPress();
        }
    });
});

function handleEnterKeyPress() {
    const msgSearchInput = document.getElementById('msgSearchInput');
    const blockchainAddress = msgSearchInput.value.trim();

    if (isBlockchainAddress(blockchainAddress)) {
        // 处理区块链地址逻辑，例如输出到控制台
        console.log('用户输入的区块链地址:', blockchainAddress);
    } else {
        console.log('用户输入的不是有效的区块链地址');
    }

    msgSearchInput.value = '';
}
function isBlockchainAddress(address) {
    // 此处可以添加你验证区块链地址的逻辑，确保输入的是一个有效的区块链地址
    // 返回 true 表示是有效的区块链地址，返回 false 表示不是
    // 示例逻辑：假设区块链地址必须包含 0x 前缀
    return address.toLowerCase().startsWith('NJ');
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

    const message = new messageItem(true, selfAccountInfo.meta.avatarBase64,
        selfAccountInfo.meta.name, messageText, new Date());

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
    loadSelfDetails(curWalletObj, true).then(r=>{
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

    cacheLoadCachedMsgListForAddr(address).then(messages => {
        const messageTemplate = Handlebars.compile(document.getElementById('messageTemplate').innerHTML);
        document.getElementById('messageContainer').innerHTML = messageTemplate({messages});
    }).catch(error => {
        showModal("加载好友列表失败:" + error);
    });
}

function loadCachedMsgTipsList() {
    const source = document.getElementById("messageTipsListTemplate").innerHTML;

    const template = Handlebars.compile(source);

    const messages = cacheLoadCachedMsgTipsList()
    document.getElementById("messageTipsList").innerHTML = template({messages: messages});
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

let lastSelectedFriendItem
function fullFillContact(item, address) {
    if (lastSelectedFriendItem) {
        lastSelectedFriendItem.classList.remove('selected');
    }
    item.classList.add('selected');
    lastSelectedFriendItem = item;
    const contactInfo = getCombinedContactByAddress(address)
    if (!contactInfo) {
        return;
    }
    document.getElementById('contactContentArea').style.display = 'block';
    document.getElementById('contactContentArea').style.visibility = 'visible';

    if (contactInfo.meta.avatarBase64) {
        document.getElementById("contactAvatarImage").src = "data:image/png;base64," + contactInfo.meta.avatarBase64;
    } else {
        document.getElementById("contactAvatarImage").src = "/assets/logo.png";
        contactInfo.meta.queryAvatarData().then(r => {
            contactInfo.meta.syncToDB();
        });
    }

    const expireDays = calculateDays(contactInfo.meta.balance)
    document.getElementById("contactInfoContainer").innerHTML = `
        <span>昵称：${contactInfo.meta.name}</span>
        <p>地址：${contactInfo.meta.address}</p>
        <p>别名: ${contactInfo.contact.alias}</p>
        <p>备注: ${contactInfo.contact.remark}</p>
        <p>余额: ${expireDays} 天</p>
    `;

    const buttonRow = document.querySelector("#contactContentArea .button-row");
    buttonRow.innerHTML = `
        <button onclick="startChatWithFriend('${contactInfo.meta.address}')">开始聊天</button>
        <button onclick="deleteFriend('${contactInfo.meta.address}')">删除好友</button>
    `;
}

function startChatWithFriend(contact) {
    console.log("start to chat with friend:", contact);
}

function deleteFriend(contact) {
    console.log("start to delete friend:", contact);
}

function exportWallet(keyString, password) {
    saveDataToDisk(keyString, 'ninja_wallet.json');
}

function removeWallet(keyString, password) {
    removeKeyItem(curWalletObj.address);
    window.location.href = '/';
}