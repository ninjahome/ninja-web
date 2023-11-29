function toECDSA(d, strict) {
    const curve = new elliptic.ec('secp256k1');
    const key = curve.keyFromPrivate(d);

    if (strict && 8 * d.length !== curve.n.bitLength()) {
        throw new Error(`Invalid length, need ${curve.n.bitLength()} bits`);
    }

    // The privateKey.D must < N
    if (key.getPrivate().gte(curve.n)) {
        throw new Error('Invalid private key, >=N');
    }

    // The privateKey.D must not be zero or negative.
    if (key.getPrivate() <= 0n) {
        throw new Error('Invalid private key, zero or negative');
    }
    key.getPublic();
    if (!key.pub) {
        throw new Error('Invalid private key');
    }
    return key;
}


function castToEthAddress(key) {
    const publicKey = key.getPublic('hex', false);
    const newArray = publicKey.slice(2)//remove first byte
    // Calculate keccak256 hash
    const hashedPublicKey = Web3.utils.keccak256(`0x${newArray}`);
    return '0x' + hashedPublicKey.slice(-40);
}

