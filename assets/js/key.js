
// key.js
class LightSubKey {
    constructor(light, id, address, privateKey) {
        this.Light = light;
        this.ID = id;
        this.Address = address;
        this.privateKey = privateKey;
    }

    AddrStr() {
        const encodedAddress = base58.encode(this.Address);
        return SubAddrPrefix + encodedAddress;
    }

    toString() {
        return JSON.stringify({
            Light: this.Light,
            ID: this.ID,
            Address: this.Address,
        });
    }
}

function ToSubAddr(addStr){
    if (!addStr.startsWith(SubAddrPrefix)) {
        return { error: "字符串不以NJ开头", result: null };
    }

    const base58Str = addStr.substring(SubAddrPrefix.length);
    const decodedResult = base58.decode(base58Str);

    if (!decodedResult) {
        return { error: "解码失败", result: null };
    }

    return { error: null, result: decodedResult };
}

function generateNewLightSubKey() {
    const keyPair = generateKeyPair();
    const publicKey = keyPair.publicKey;
    const privateKey = keyPair.privateKey;

    const addr = generateSubAddr(publicKey);
    const id = generateUUID();
    return new LightSubKey(true, id, addr, privateKey);
}

function generateKeyPair() {
    var keyPair = nacl.sign.keyPair();
    var publicKey = keyPair.publicKey;
    var privateKey = keyPair.secretKey;
    return { publicKey, privateKey };
}

function generateSubAddr(publicKey) {
    var subAddr = new Uint8Array(SubAddressLen);
    subAddr.set(publicKey.subarray(0, SubAddressLen));
    return subAddr;
}

function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0,
            v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}
