import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Stop `next dev` from writing an AGENTS.md file into the repository.
  agentRules: false,
};

export default nextConfig;
