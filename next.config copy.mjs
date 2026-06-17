/** @type {import('next').NextConfig} */
const nextConfig = {

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "storage.googleapis.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "api.qrserver.com",
        pathname: "/**",
      },
    ],

    formats: ["image/avif", "image/webp"],

    deviceSizes: [320, 480, 640, 768, 1024],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],

    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
  async rewrites() {
    return [
      /*  {
         source: '/cabanas-en-:locality',
         destination: '/pages/cabanas-en/:locality',
       },
       {
         source: '/donde-comer-en-:locality',
         destination: '/pages/donde-comer-en/:locality',
       },
       {
         source: '/que-regalar-en-:locality',
         destination: '/pages/que-regalar-en/:locality',
       },
       {
         source: '/login',
         destination: '/auth/login',
       },
       {
         source: '/logout',
         destination: '/auth/logout',
       },
       {
         source: '/register',
         destination: '/auth/register',
       },
       {
         source: '/forget-password',
         destination: '/auth/forget-password',
       },
       {
         source: '/subscriptions',
         destination: '/pages/subscriptions',
       },
       {
         source: '/calendar',
         destination: '/pages/calendar',
       },
       {
         source: '/favorites',
         destination: '/pages/favorites',
       },
       {
         source: '/userprofile',
         destination: '/pages/userprofile',
       },
       {
         source: '/about',
         destination: '/pages/about',
       },
       {
         source: '/services',
         destination: '/pages/services',
       },
       {
         source: '/publish',
         destination: '/pages/publish',
       },
       {
         source: '/search',
         destination: '/pages/search',
       },
       {
         source: '/todonotes',
         destination: '/pages/todonotes',
       },
       {
         source: '/linktree',
         destination: '/pages/linktree',
       },
       {
         source: '/coupons',
         destination: '/pages/coupons',
       },
       {
         source: '/coupons/confirm',
         destination: '/pages/coupons/confirm',
       },
       {
         source: '/coupons/scan',
         destination: '/pages/coupons/scan',
       },
       {
         source: '/offers',
         destination: '/pages/offers',
       },
       {
         source: '/register-publisher',
         destination: '/pages/register-publisher',
       },
       {
         source: '/suscription-payment/confirm',
         destination: '/pages/online-payment/suscription-payment/confirm',
       },
       {
         source: '/suscription-payment/success',
         destination: '/pages/online-payment/suscription-payment/success',
       },
       {
         source: '/suscription-payment/failure',
         destination: '/pages/online-payment/suscription-payment/failure',
       },
       {
         source: '/suscription-payment/pending',
         destination: '/pages/online-payment/suscription-payment/pending',
       },
       {
         source: '/marketplace/connect-your-account',
         destination: '/pages/online-payment/marketplace/connect-your-account',
       },
       {
         source: '/marketplace/connect-your-account/failure',
         destination: '/pages/online-payment/marketplace/connect-your-account/failure',
       },
       {
         source: '/marketplace/connect-your-account/callback',
         destination: '/pages/online-payment/marketplace/connect-your-account/callback',
       },
       {
         source: '/publishers_videos',
         destination: '/pages/videos/publishers',
       },
       {
         source: '/users_videos',
         destination: '/pages/videos/users',
       },
       {
         source: '/acomerciar-urls',
         destination: '/pages/acomerciar-urls',
       },
       {
         source: '/alojamientos',
         destination: '/pages/tourist_accomodation',
       },
       {
         source: '/actividades-turisticas',
         destination: '/pages/tourist_activities',
       },
       {
         source: '/regalos-artesanias-regionales',
         destination: '/pages/tourist_sales',
       },
       {
         source: '/donde-comer',
         destination: '/pages/tourist_restaurants',
       },
       {
         source: '/admin/main',
         destination: '/admin/pages/main',
       },
       {
         source: '/admin/crud',
         destination: '/admin/pages/crud',
       },
       {
         source: '/ecommerce',
         destination: '/modules/ecommerce/pages',
       },
       {
         source: '/shop',
         destination: '/modules/shop',
       },
       {
         source: '/admin/main',
         destination: '/admin',
       },
       {
         source: '/:prestador',
         destination: '/modules/webs/:prestador',
       },
       {
         source: '/shop/:prestador',
         destination: '/modules/shop/:prestador',
       },
       { 
         source: '/:prestador/:productId',
         destination: '/modules/webs/:prestador/:productId',
       }, */
    ];
  },
};

export default nextConfig;