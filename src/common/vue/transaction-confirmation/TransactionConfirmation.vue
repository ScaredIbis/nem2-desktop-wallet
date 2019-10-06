<template>
  <div class="disabledUiOverlay">
    <Modal
            v-if="show"
            v-model="show"
            class-name="vertical-center-modal"
            :footer-hide="true"
            :transfer="false"
            >

      <button @click="confirmTransaction">confirm</button>
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
