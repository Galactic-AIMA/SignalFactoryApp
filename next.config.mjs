/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // Excluir módulos nativos del bundle — solo se usan en server-side
    config.externals = [
      ...(config.externals || []),
      "better-sqlite3",
    ];

    if (isServer) {
      // Remotion bundler/renderer tienen bindings nativos (rspack, esbuild)
      // que solo se necesitan en el servidor para renderizado
      config.externals.push(
        "@remotion/bundler",
        "@remotion/renderer",
        "@remotion/cli",
      );
    }

    return config;
  },
  // Remotion Player funciona como paquete normal de React en el cliente
  transpilePackages: ["remotion", "@remotion/player"],
  // Timeout largo para API routes de render (~5-10 min)
  serverRuntimeConfig: {
    apiTimeout: 600000,
  },
  experimental: {
    proxyTimeout: 600000,
  },
};

export default nextConfig;
