/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // @demand-collector/core 是 CommonJS，不需要 transpile，直接 require
  // playwright 有原生二进制，运行时解析
  serverExternalPackages: ['playwright', '@demand-collector/core'],
};

export default nextConfig;
