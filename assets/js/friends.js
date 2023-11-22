function LoadCachedFriedList() {
    return ["NJA1fmxxVFRY2XWvcPU41zfxMrjb2iXDzaRW4jSD1gVCFg", "NJJ5ryLVoNG9Cm9yaPheMQH4tpUYoGyKYXGWNfFqLTFGLP"];
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
    const item_1 = new messageTipsItem("NJA1fmxxVFRY2XWvcPU41zfxMrjb2iXDzaRW4jSD1gVCFg",
        "/assets/logo.png", "日本聪",
        new Date(), "文本消息");
    const item_2 = new messageTipsItem("NJJ5ryLVoNG9Cm9yaPheMQH4tpUYoGyKYXGWNfFqLTFGLP",
        "/assets/logo.png", "中本聪",
        new Date(), "文本消息");
    const item_3 = new messageTipsItem("NJA1fmxxVFRY2XWvcPU41zfxMrjb2iXDzaRW4jSD1gVCFg",
        "/assets/logo.png", "V神",
        new Date(), "文本消息");

    result.push(item_1);
    result.push(item_2);
    result.push(item_3);

    return result
}