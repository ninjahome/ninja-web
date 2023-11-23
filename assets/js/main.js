
function togglePanels(button, panelToShow, contentToShow) {
    document.getElementById('messageControlPanel').style.display = 'none';
    document.getElementById('friendControlPanel').style.display = 'none';
    document.getElementById('settingsMenu').style.display = 'none';

    document.getElementById('messageContentArea').style.display = 'none';
    document.getElementById('contactContentArea').style.display = 'none';
    document.getElementById('settingContentArea').style.display = 'none';

    document.getElementById(panelToShow).style.display = 'block';
    document.getElementById(contentToShow).style.display = 'block';
    toggleButton(button);
}

function toggleButton(button) {
    // 移除所有按钮的选中状态
    const buttons = document.querySelectorAll('.button');
    buttons.forEach(b => b.classList.remove('selected'));

    // 添加选中状态到当前按钮
    if (!button) {
        button = buttons[0];
    }
    button.classList.add('selected');
}

function logout() {
    quitFromSession();
}

function accountSetting() {
    document.getElementById('accountSettingContentArea').style.display = 'block';
    document.getElementById('avatarImage').src = '/assets/logo.png';
    document.getElementById('blockchainAddress').innerText = '实际的区块链地址';
    document.getElementById('nickname').innerText = '实际的昵称';
    document.getElementById('ethBalance').innerText = '实际的ETH余额'; // 例如：'0.00 ETH'
    document.getElementById('usdtBalance').innerText = '实际的USDT余额';
}

function displayBalance() {
    console.log('执行显示余额操作');
}

Handlebars.registerHelper('formatTime', function (time) {
    const currentDate = new Date();
    const messageDate = new Date(time);
    const timeDiff = currentDate - messageDate;
    console.log("time from data:", time, "diff", timeDiff);

    if (timeDiff > 24 * 60 * 60 * 1000) {
        // If the time difference is more than 24 hours, use DD/MM/YY format
        const day = messageDate.getDate();
        const month = messageDate.getMonth() + 1; // Month is zero-based
        const year = messageDate.getFullYear().toString().slice(-2); // Get last two digits of the year
        return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
    } else {
        // Otherwise, use MM:SS format
        const minutes = messageDate.getUTCMinutes();
        const seconds = messageDate.getSeconds();
        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
});


let privateKey = null;
document.addEventListener("DOMContentLoaded", function () {
    // 在页面加载完成后执行检查逻辑
    checkSessionKeyPriKey();
    // 监听浏览器的回退事件
    window.addEventListener('popstate', function () {
        clearSessionStorage();
    });
    loadCachedMsgList();
    loadCachedFriendList();
    addItemColorChangeAction();
    togglePanels(null, 'messageControlPanel', 'messageContentArea');
});

function addItemColorChangeAction() {
    const messageItems = document.querySelectorAll('.messageTipsItem');
    messageItems.forEach(item => {
        item.addEventListener('click', () => {
            messageItems.forEach(otherItem => otherItem.classList.remove('selected'));
            item.classList.add('selected');
        });
    });

    const friendListItem = document.querySelectorAll('.friendListItem');
    friendListItem.forEach(item => {
        item.addEventListener('click', () => {
            friendListItem.forEach(otherItem => otherItem.classList.remove('selected'));
            item.classList.add('selected');
        });
    });

}

function checkSessionKeyPriKey() {
    // 使用 utils.js 中的函数检查 SessionKeyPriKey 是否存在
    privateKey = getDataFromSessionStorage(SessionKeyPriKey);

    if (!privateKey) {
        // 如果不存在，则跳转到根目录
        window.location.href = "/";
    }
}

// 清空 sessionStorage
function clearSessionStorage() {
    sessionStorage.clear();
    privateKey = null;
}

function openExportDialog() {
    document.getElementById('passwordDialog').style.display = 'block';
}

function closeExportDialog() {
    document.getElementById('passwordDialog').style.display = 'none';
    clearErrorText();
}

function validatePassword() {
    const password = document.getElementById('passwordInput').value;
    const errorText = document.getElementById('errorText');
    if (password.length === 0) {
        showError('密码不能为空');
        return;
    }

    const keyString = localStorage.getItem(DBKeyWalletAddr + privateKey.address);
    if (!keyString) {
        showError('加载钱包信息失败：' + privateKey.address);
        return
    }

    getEncryptedKeyJSON(keyString, password).then(() => {
        clearErrorText();
        saveDataToDisk(keyString, 'ninja_wallet.json');
        closeExportDialog();
    }).catch((error) => {
        showError('密码错误，请重新输入:' + error);
        ;
    });
}

function showError(message) {
    const errorText = document.getElementById('errorText');
    errorText.innerText = message;
    errorText.style.display = 'block';
}

function clearErrorText() {
    const errorText = document.getElementById('errorText');
    errorText.innerText = ''; // 清空错误信息
    errorText.style.display = 'none'; // 隐藏错误提示
}

function loadCachedMsgList() {
    // 从HTML中获取Handlebars模板源代码
    const source = document.getElementById("messageTipsListTemplate").innerHTML;

// 编译模板
    const template = Handlebars.compile(source);

// 示例数据（用你的实际数据替换这部分）
    const messages = cacheLoadCachedMsgList()

// 使用数据渲染模板
    document.getElementById("messageTipsList").innerHTML = template({messages: messages});
}

function clearCachedMsg() {

}

function deleteAccount() {

}

function loadCachedFriendList() {
    // Get the Handlebars template source code
    const source = document.getElementById("friendListTemplate").innerHTML;

    // Compile the template
    const template = Handlebars.compile(source);

    // Replace this with actual data for your friends
    const friends = cacheLoadCachedFriedList();

    // Render the template with the friend data
    document.getElementById("friendList").innerHTML = template({friends: friends});
}