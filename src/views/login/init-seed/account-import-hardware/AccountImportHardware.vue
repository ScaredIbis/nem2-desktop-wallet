<template>
  <div>
    <div class="page_import_title">{{$t('connect_trezor_title')}}</div>
    <div class="describle">{{$t('trezor_description')}}</div>

    <button class="button import" @click="loginToTrezor"> {{$t('connect_trezor_prompt')}}</button>

    <div class="bottom_button">
      <button class="button" @click="toBack"> {{$t('back')}}</button>
    </div>
  </div>

</template>

<script lang="ts">
    //@ts-ignore
    import { AccountImportHardwareTs } from '@/views/login/init-seed/account-import-hardware/AccountImportHardwareTs.ts'
    import "./AccountImportHardware.less"
    export default class AccountImportHardware extends AccountImportHardwareTs {

    }
</script>
<style scoped lang="less">
</style>
