// Public business information only. Secrets belong in server-only modules.
export const serviceConfig = {
  name: "GoSsaem",
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "",
  operator: process.env.NEXT_PUBLIC_OPERATOR_NAME || "",
  registration: process.env.NEXT_PUBLIC_BUSINESS_REGISTRATION || "",
  address: process.env.NEXT_PUBLIC_BUSINESS_ADDRESS || "",
  policiesPublished: process.env.NEXT_PUBLIC_POLICIES_PUBLISHED === "true",
  policyVersion: "2026-11-16",
};
