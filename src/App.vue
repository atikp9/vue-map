<template>
  <div class="main-wrapper">
    <div class="menu">
      <router-link to="/">Home</router-link>
      <router-link to="/wkt">GridLayer</router-link>
    </div>
    <div class="map-wrapper">
      <router-view />
    </div>
  </div>
</template>
<style lang="scss" scoped>

.main-wrapper {
  height: 100vh;
  width: 100vw;

  .menu {
    width: 100%;
    background-color: #fff;
    height: 50px;
    display: flex;
    align-items: center;
    padding: 0px 10px;
    box-shadow: 0 3px 10px rgba(29,36,48,.08);

    .router-link-active {
      text-decoration: underline;
      font-weight: 700;  
    }
  }
}

a {
  text-decoration: none;
  padding: 0;
  margin: 0;
  font-size: 1.5 rem;
  margin: 0px 10px;
}
</style>
