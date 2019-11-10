import {Address, Transaction, AccountHttp, QueryParams} from "nem2-sdk"
import {transactionFormat} from './formatting'
import {AppState, TRANSACTIONS_CATEGORIES} from '@/core/model'
import {Store} from 'vuex'

// @TODO: refactor
export const formatAndSave = (  transaction: Transaction,
                                store: Store<AppState>,
                                confirmed: boolean,
                                transactionCategory: string): void => {
    const formattedTransactions = transactionFormat(
        [transaction],
        store,
    )
    
    if (transactionCategory === TRANSACTIONS_CATEGORIES.TO_COSIGN) {
        const {publicKey} = store.state.account.wallet
        store.commit('ADD_TRANSACTION_TO_COSIGN', {publicKey, transactions: formattedTransactions})
        return
    }

    if(confirmed) {
        store.commit('ADD_CONFIRMED_TRANSACTION', formattedTransactions)
        return
    }

    store.commit('ADD_UNCONFIRMED_TRANSACTION', formattedTransactions)
}

export const setTransactionList = (address: string, store: Store<AppState>): void => {
    const {node} = store.state.account
    const accountHttp = new AccountHttp(node)
    const _address = Address.createFromRawAddress(address)

    accountHttp.transactions(_address, new QueryParams(100)).subscribe(
        (transactionList: Transaction[]) => {
            const txList = transactionFormat(transactionList, store)
            store.commit('SET_TRANSACTION_LIST', txList)
            store.commit('SET_TRANSACTIONS_LOADING', false)
        },
        (error) => console.error("setTransactionList -> transactions -> error", error)
    )

    accountHttp.unconfirmedTransactions(_address, new QueryParams(100)).subscribe(
        (transactionList: Transaction[]) => {
            const txList = transactionFormat(transactionList, store)
                .map(x => ({...x, isTxUnconfirmed: true}))

            store.commit('SET_UNCONFIRMED_TRANSACTION_LIST', txList)
        },
        (error) => console.error("setTransactionList -> unconfirmedTransactions -> error", error)
    )
}
