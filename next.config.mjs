/** @type {import('next').NextConfig} */
const nextConfig = {
    output: "export",  // <=== enables static exports
    trailingSlash: true,
    images: {
        unoptimized: true,
    },
};

export default nextConfig;
