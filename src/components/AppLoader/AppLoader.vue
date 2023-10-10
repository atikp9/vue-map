<template>
  <div class="loader-wrapper">
    <div class="loader">Loading</div>
  </div>
</template>

<style lang="scss">
.loader-wrapper {
  display: flex;
  height: 100vh;
  width: 100vw;
  background: rgba(0,0,0,0.5);
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  top: 0;
  
  .loader {
    align-items: center;
    justify-content: center;
    display: flex;
    width:100%;
    font-size: 30px;
  }
}
</style>