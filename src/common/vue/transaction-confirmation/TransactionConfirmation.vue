<template>
  <div class="transactionConfirmationWrap">
    <Modal
      v-if="show"
      v-model="show"
      class-name="vertical-center-modal"
      :footer-hide="true"
      :transfer="false"
      >

      <div slot="header" class="transactionConfirmationHeader">
        <span class="title">{{$t('confirm_information')}}</span>
      </div>
      <div class="transactionConfirmationBody">
        <div class="info_container">
          <div
                  v-for="(value,key,index) in previewTransaction"
                  :key="`ic${index}`"
                  class="info_container_item">
            <span class="key">{{$t(key)}}</span>
            <span v-if="key == 'transaction_type'" class="value orange">{{$t(value)}}</span>
            <span v-else class="value overflow_ellipsis">{{value}}</span>
          </div>
        </div>


        <form>
          <div v-if="wallet.sourceType === walletTypes.trezor">
            <Button
              type="success"
              @click="confirmTransactionViaTrezor"
              v-if="wallet.sourceType === walletTypes.trezor"
            >
              confirm via trezor
            </Button>
          </div>
          <div v-else>
            <input v-model="password" type="password" required
                  :placeholder="$t('please_enter_your_wallet_password')"/>
            <Button type="success" @click="confirmTransactionViaPassword">{{$t('confirm')}}</Button>
          </div>
        </form>
      </div>
    </Modal>
  </div>
</template>

<script lang="ts">
    import "./TransactionConfirmation.less"
    import {TransactionConfirmationTs} from '@/common/vue/transaction-confirmation/TransactionConfirmationTs.ts'

    export default class TransactionConfirmation extends TransactionConfirmationTs {
    }
</script>

<style scoped>
</style>