
class contactItem{
    constructor(address, avatarUrl,nickname,alias, demo) {
        this.address = address;
        this.avatarUrl = avatarUrl;
        this.nickname = nickname;
        this.alias = alias;
        this.demo = demo;
    }
}

function cacheLoadCachedFriedList() {

    const storedData =localStorage.getItem(DBKeyAllContactData)
    if (!storedData){
        return [];
    }

    const parsedData = JSON.parse(storedData);
    // 将数组中的每个元素实例化为 messageTipsItem 对象
    return parsedData.map(item => {
        return new contactItem(
            item.address,
            item.avatarUrl,
            item.nickname,
            item.alias,
            item.demo
        );
    });

    // const item_1 = new contactItem(
    //     "NJA1fmxxVFRY2XWvcPU41zfxMrjb2iXDzaRW4jSD1gVCFg",
    //             "/assets/logo.png",
    //             "日本聪"
    // )
    // const item_2 = new contactItem(
    //     "NJJ5ryLVoNG9Cm9yaPheMQH4tpUYoGyKYXGWNfFqLTFGLP",
    //     "/assets/logo.png",
    //     "中本聪"
    // )
    //
    // const result = [];
    // result.push(item_1);
    // result.push(item_2);
    //
    // return result;
}

function  loadContactDetails(address){

    const item = new contactItem(address,
        "/assets/logo.png","日本聪","老赵","这个是我华为的同事");
    return item;
}

class messageTipsItem {
    constructor(address, avatarUrl, nickname, time, description) {
        this.address = address;
        this.avatarUrl = avatarUrl;
        this.nickname = nickname;
        this.time = time;
        this.description = description;
    }
}

function cacheLoadCachedMsgTipsList() {

    const result = [];
    const currentDate = new Date();
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(currentDate.getDate() - 2);

    const item_1 = new messageTipsItem("NJA1fmxxVFRY2XWvcPU41zfxMrjb2iXDzaRW4jSD1gVCFg",
        "/assets/logo.png", "日本聪",
        currentDate, "文本消息");
    const item_2 = new messageTipsItem("NJJ5ryLVoNG9Cm9yaPheMQH4tpUYoGyKYXGWNfFqLTFGLP",
        "/assets/logo.png", "中本聪",
        currentDate, "文本消息");
    const item_3 = new messageTipsItem("NJA1fmxxVFRY2XWvcPU41zfxMrjb2iXDzaRW4jSD1gVCFg",
        "/assets/logo.png", "V神",
        twoDaysAgo, "文本消息");

    result.push(item_1);
    result.push(item_2);
    result.push(item_3);

    return result
}

class messageItem{
    constructor(isSelf, avatarUrl, nickname, msgPayload, time) {
        this.isSelf = isSelf;
        this.avatarUrl = avatarUrl;
        this.nickname=nickname;
        this.msgPayload = msgPayload;
        this.time = time;
    }
}

async function cacheLoadCachedMsgListForAddr(address){

    const result = [];

    const currentDate = new Date();
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(currentDate.getDate() - 2);

    const contact = loadContactDetails(address)
    const msg_1 = new messageItem(true, "/assets/logo.png",
        "中本聪", "早上好", twoDaysAgo);
    const msg_2 = new messageItem(false, "/assets/logo.png",
        "日本聪", "您好！很开心和您聊天😊", twoDaysAgo);

    const msg_3 = new messageItem(true, "/assets/logo.png",
        "中本聪", "最近项目的进展咋样？", currentDate);

    const msg_4 = new messageItem(false, "/assets/logo.png",
        "日本聪", "项目进展顺利，我们在使用新的技术编程", currentDate);

    result.push(msg_1);
    result.push(msg_2);
    result.push(msg_3);
    result.push(msg_4);
    return result;

}