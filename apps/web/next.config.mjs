/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@demand-collector/core'],
  // playwright 有原生二进制，不能被 webpack 打包，让 Node.js 在运行时按模块路径解析
  serverExternalPackages: ['playwright'],
};

export default nextConfig;
