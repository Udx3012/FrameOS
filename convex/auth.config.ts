declare const process: { env: Record<string, string | undefined> };
const domain = process.env.CLERK_JWT_ISSUER_DOMAIN || "https://clerk.placeholder.dev";
export default {
  providers: [
    { domain, applicationID: "convex" },
  ],
};
