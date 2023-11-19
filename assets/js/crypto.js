// crypto.js
class CryptoStruct {
    constructor(cipher, cipherText, cipherParams, kdf, kdfParams, mac) {
        this.Cipher = cipher;
        this.CipherText = cipherText;
        this.CipherParams = cipherParams;
        this.KDF = kdf;
        this.KDFParams = kdfParams;
        this.MAC = mac;
    }
}

async function encryptData(privateKey, passwordBytes) {
    const salt = generateSalt(32);
    const derivedKey = await deriveKeyFromPassword(passwordBytes, salt);

    const encryptKey = derivedKey.slice(0, 16);
    const iv = generateSalt(16);

    const encryptedPrivateKey = await encryptPrivateKey(encryptKey, privateKey, iv);

    const lastPiece = derivedKey.slice(16, 32);
    const combinedArray = new Uint8Array([...lastPiece, ...encryptedPrivateKey]);

    const mac = Web3.utils.sha3(combinedArray);

    const scryptParams = {
        n: LightScryptN,
        r: ScryptR,
        p: LightScryptP,
        dklen: ScryptDKLen,
        salt: Buffer.from(salt).toString('hex'),
    };

    const cipherParams = {
        IV: Buffer.from(iv).toString('hex'),
    };

    return new CryptoStruct(
        "aes-128-ctr",
        Buffer.from(encryptedPrivateKey).toString('hex'),
        cipherParams,
        "scrypt",
        scryptParams,
        Buffer.from(mac).toString('hex')
    );
}

function generateSalt(len) {
    const salt = new Uint8Array(len);
    window.crypto.getRandomValues(salt);
    return salt;
}

async function deriveKeyFromPassword(passwordBytes, salt) {
    return new Promise((resolve) => {
        scrypt(passwordBytes, salt, { N: LightScryptN, r: ScryptR, p: LightScryptP, dkLen: ScryptDKLen, encoding: 'binary' }, resolve);
    });
}

async function encryptPrivateKey(key, privateKey, iv) {
    try {
        const importedKey = await importAesKey(key);
        const encrypted = await window.crypto.subtle.encrypt(
            { name: "AES-CTR", counter: iv, length: 128 },
            importedKey,
            privateKey
        );
        return new Uint8Array(encrypted);
    } catch (error) {
        console.error("Encryption Error:", error);
        throw error;
    }
}

async function importAesKey(key) {
    return window.crypto.subtle.importKey("raw", key, { name: "AES-CTR" }, false, ["encrypt", "decrypt"]);
}


