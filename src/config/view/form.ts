import {NetworkType} from "nem2-sdk"
import {FEE_SPEEDS} from '@/config'


export const formDataConfig = {
    settingPassword: {
        previousPassword: '',
        newPassword: '',
        confirmPassword: '',
        cipher: '',
        hint: 'PLACEHOLDER_cipher_hint',
    },
    offsetLineForm: {
        generationHash: '',
        mosaicId: '',
        divisibility: 1,
        ticker: 'XEM',
        mosaicName: '',
    },
    createAccountForm: {
        accountName: '',
        password: '',
        passwordAgain: '',
        hint: '',
        networkType: NetworkType.MIJIN_TEST,
    },
    importKeystoreConfig: {
        walletName: 'keystore-wallet',
        keystoreStr: '',
        keystorePassword: ''
    },
    transferForm: {
        recipient: '',
        remark: '',
        multisigPublicKey: '',
        feeSpeed: FEE_SPEEDS.NORMAL,
        mosaicTransferList: [],
        isEncrypted: true
    },
    remoteForm: {
        remotePublicKey: '',
        feeSpeed: FEE_SPEEDS.NORMAL,
        password: ''
    },
    mosaicAliasForm: {
        mosaicName: '',
        feeSpeed: FEE_SPEEDS.NORMAL,
        password: ''
    },
    mosaicEditForm: {
        id: '',
        aliasName: '',
        delta: 0,
        supplyType: 1,
        changeDelta: 0,
        duration: '',
        feeSpeed: FEE_SPEEDS.NORMAL,
        password: ''
    },
    mosaicUnAliasForm: {
        feeSpeed: FEE_SPEEDS.NORMAL,
        password: ''
    },
    addressAliasForm: {
        address: '',
        feeSpeed: FEE_SPEEDS.NORMAL,
        password: ''
    },
    alias: {
        feeSpeed: FEE_SPEEDS.NORMAL,
        password: ''
    },
    mosaicTransactionForm: {
        restrictable: false,
        supply: 500000000,
        divisibility: 0,
        transferable: true,
        supplyMutable: true,
        permanent: true,
        duration: 1000,
        feeSpeed: FEE_SPEEDS.NORMAL,
        multisigPublicKey: ''
    },
    multisigConversionForm: {
        modificationList: [],
        minApproval: 1,
        minRemoval: 1,
        feeSpeed: FEE_SPEEDS.NORMAL,
        multisigPublicKey: '',
    },
    multisigModificationForm: {
        modificationList: [],
        minApproval: 0,
        minRemoval: 0,
        feeSpeed: FEE_SPEEDS.NORMAL,
        multisigPublicKey: '',
    },
    namespaceEditForm: {
        name: '',
        duration: 0,
        feeSpeed: FEE_SPEEDS.NORMAL,
        password: ''
    },
    rootNamespaceForm: {
        duration: 1000,
        rootNamespaceName: '',
        multisigPublicKey: '',
        feeSpeed: FEE_SPEEDS.NORMAL,
    },
    subNamespaceForm: {
        rootNamespaceName: '',
        subNamespaceName: '',
        multisigPublicKey: '',
        feeSpeed: FEE_SPEEDS.NORMAL,
    },
    walletImportMnemonicForm: {
        mnemonic: '',
        walletName: '',
    },
    walletImportPrivateKeyForm: {
        privateKey: '',
        walletName: 'wallet-privateKey',
    },
    trezorImportForm: {
        networkType: NetworkType.MIJIN_TEST,
        accountIndex: 0,
        walletName: 'Trezor Wallet'
    },
    walletCreateForm: {
        walletName: 'wallet-create',
        path: 0
    }
}
