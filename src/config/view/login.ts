import {localRead} from "@/core/utils"

import seedImg from "@/common/img/login/seed.png"
import trezorImg from "@/common/img/login/trezor.png"
import ledgerImg from "@/common/img/login/ledger.png"

import importTrezorStepImage1 from "@/common/img/login/1_2.png"
import importTrezorStepImage2 from "@/common/img/login/2_2.png"

import importStepImage1 from "@/common/img/login/1_4.png"
import importStepImage2 from "@/common/img/login/2_4.png"
import importStepImage3 from "@/common/img/login/3_4.png"
import importStepImage4 from "@/common/img/login/4_4.png"

import createStepImage1 from "@/common/img/login/1_5.png"
import createStepImage2 from "@/common/img/login/2_5.png"
import createStepImage3 from "@/common/img/login/3_5.png"
import createStepImage4 from "@/common/img/login/4_5.png"
import createStepImage5 from "@/common/img/login/5_5.png"

export const importInfoList = [
    {
        image: seedImg,
        title: "Import_Seed",
        description: "Import_Mnemonic_phrase_directly_to_make_an_account",
        link: "importAccount",
    },
    {
        image: trezorImg,
        title: "Access_Trezor",
        description: "Access_your_trezor_wallet_to_make_trezor_account",
        link: localRead && localRead("_ENABLE_TREZOR_") === "true" ? "importTrezorAccount" : null,
    },
    {
        image: ledgerImg,
        title: "Access_Ledger",
        description: "Access_your_ledger_wallet_to_make_ledge_account",
        link: null,
    }
]

export const createStepBarTitleList = [
    "create_account_step_create_account",
    "create_account_step_generate_mnemonic",
    "create_account_step_backup_mnemonic_phrase",
    "create_account_step_verify_mnemonic_phrase",
    "create_account_step_finished"
]

export const importStepBarTitleList = [
    "import_account_step_create_account",
    "import_account_step_type_mnemonic_phrase",
    "import_account_step_choose_wallets",
    "import_account_step_finished"
]

export const importTrezorStepBarTitleList = [
    "trezor_step_create_account",
    "trezor_step_import_account"
]

export const importStepImage = {
    importStepImage1,
    importStepImage2,
    importStepImage3,
    importStepImage4,
}

export const createStepImage = {
    createStepImage1,
    createStepImage2,
    createStepImage3,
    createStepImage4,
    createStepImage5,
}

export const importTrezorStepImage = {
    importTrezorStepImage1,
    importTrezorStepImage2,
}
