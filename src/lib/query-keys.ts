const entityKeys = <TFilters = Record<string, unknown>>(name: string) => ({
  root: () => [name] as const,
  list: (filters?: TFilters) => [name, "list", filters ?? {}] as const,
  detail: (id: string) => [name, "detail", id] as const,
});

const singletonKey = <TName extends string>(name: TName) => ({
  root: () => [name] as const,
});

export const queryKeys = {
  academicStructure: singletonKey("academic-structure"),
  campuses: entityKeys("campuses"),
  programs: entityKeys("programs"),
  disciplines: entityKeys("disciplines"),
  students: entityKeys("students"),
  dashboard: {
    root: () => ["dashboard"] as const,
    summary: () => ["dashboard", "summary"] as const,
  },
  integrations: {
    smtp: singletonKey("integrations-smtp"),
    whatsapp: singletonKey("integrations-whatsapp"),
  },
};
