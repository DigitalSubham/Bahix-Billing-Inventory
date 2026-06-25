export const clean = (v: any) =>
  typeof v === "string" && v.trim() === "" ? null : v;
