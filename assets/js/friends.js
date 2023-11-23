
class contactItem{
    constructor(address, avatarUrl,nickname) {
        this.address = address;
        this.avatarUrl = avatarUrl;
        this.nickname = nickname;
    }
}

function cacheLoadCachedFriedList() {
    const item_1 = new contactItem(
        "NJA1fmxxVFRY2XWvcPU41zfxMrjb2iXDzaRW4jSD1gVCFg",
                "/assets/logo.png",
                "日本聪"
    )
    const item_2 = new contactItem(
        "NJJ5ryLVoNG9Cm9yaPheMQH4tpUYoGyKYXGWNfFqLTFGLP",
        "/assets/logo.png",
        "中本聪"
    )

    const result = [];
    result.push(item_1);
    result.push(item_2);

    return result;
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

function cacheLoadCachedMsgList() {
    const result = [];
    const currentDate = new Date();
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(currentDate.getDate() - 2);
    console.log("this diff",currentDate - twoDaysAgo, 2*24 * 60 * 60 * 1000)

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