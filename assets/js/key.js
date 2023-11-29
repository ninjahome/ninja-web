// key.js
class LightSubKey {
    constructor(light, id, address, privateKey) {
        this.light = light;
        this.id = id;
        this.address = address;
        this.privateKey = privateKey;
        this.ethAddress = "";
        this.ethPriKey = null;
    }

    AddrStr() {
        const encodedAddress = base58.encode(this.address);
        return SubAddrPrefix + encodedAddress;
    }

    castEthKey() {
        if (!this.privateKey) {
            return null;
        }
        const pri = this.privateKey.slice(0, 32);
        const ethPri = toECDSA(pri, false);
        this.ethAddress = castToEthAddress(ethPri);
        this.ethPriKey = ethPri;
        return ethPri;
    }

    EthAddrStr() {
        if (this.ethAddress) {
            return this.ethAddress;
        }
        this.castEthKey();
        return this.ethAddress;
    }
}

function ToSubAddr(addStr) {
    if (!addStr.startsWith(SubAddrPrefix)) {
        return {error: "字符串不以NJ开头", result: null};
    }

    const base58Str = addStr.substring(SubAddrPrefix.length);
    const decodedResult = base58.decode(base58Str);

    if (!decodedResult) {
        return {error: "解码失败", result: null};
    }

    return {error: null, result: decodedResult};
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
    const keyPair = nacl.sign.keyPair();
    const publicKey = keyPair.publicKey;
    const privateKey = keyPair.secretKey;
    return {publicKey, privateKey};
}

function generateSubAddr(publicKey) {
    const subAddr = new Uint8Array(SubAddressLen);
    subAddr.set(publicKey.subarray(0, SubAddressLen));
    return subAddr;
}

function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0,
            v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}
