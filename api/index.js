process.env.VERCEL = process.env.VERCEL || "1";

const serverModule = require("../artifacts/api-server/dist/index.cjs");

module.exports = serverModule.default || serverModule;
