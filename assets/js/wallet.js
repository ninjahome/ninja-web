// wallet.js
class EncryptedKeyJSON {
    constructor(address, crypto, id, version) {
        this.address = address;
        this.crypto = crypto;
        this.id = id;
        this.version = version;
    }
}

class Wallet{
    constructor(address, jsonStr, atTime) {
        this.address = address;
        this.jsonStr = jsonStr;
        this.atTime = atTime;
    }
}

async function addNewKeyItem(encryptedKeyJSON) {
    const jsonString = JSON.stringify(encryptedKeyJSON, null, '\t');
    const wallet = new Wallet(encryptedKeyJSON.address, jsonString, new Date());
    await dbManager.addData(IndexedDBManager.WALLET_TABLE_NAME, wallet);
}

async function newWallet(password) {
    try {
        const key = generateNewLightSubKey();
        const passwordBytes = stringToBytes(password);
        const cryptoStruct = await encryptData(key.privateKey, passwordBytes);
        const encryptedKeyJSON = new EncryptedKeyJSON(
            key.AddrStr(),
            cryptoStruct,
            key.id,
            WalletVer);
        await addNewKeyItem(encryptedKeyJSON);
        return encryptedKeyJSON;
    } catch (error) {
        console.error("Error:", error);
        throw error;
    }
}

async function getEncryptedKeyJSON(keyString, password) {
    if (!keyString) {
        throw new Error("Key not found for wallet address:" + keyString);
    }
    const keyData = JSON.parse(keyString);
    // 检查 keyData 是否包含必要的属性
    if (!keyData.address || !keyData.crypto || !keyData.id || !keyData.version) {
        throw new Error("Invalid key data");
    }

    const cryptoStruct = new CryptoStruct(
        keyData.crypto.cipher,
        keyData.crypto.ciphertext,
        keyData.crypto.cipherParams,
        keyData.crypto.kdf,
        keyData.crypto.kdfParams,
        keyData.crypto.mac
    );
    const privateKey = await decryptData(cryptoStruct, password);

    if (!privateKey) {
        throw new Error("Failed to decrypt private key for wallet:" + keyString);
    }

    return new LightSubKey(true, keyData.id, keyData.address, privateKey);
}