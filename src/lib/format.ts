import type { StudentStatus } from "@/lib/types";

export const studentStatusLabel = (status?: StudentStatus) => {
  switch (status) {
    case "ACTIVE":
      return "Ativo";
    case "CANCELED":
      return "Cancelado";
    case "GRADUATED":
      return "Formado";
    case "LOCKED":
      return "Bloqueado";
    case "PENDING":
      return "Pendente";
    default:
      return "Indefinido";
  }
};

export const formatPhone = (value?: string) => {
  if (!value) return "";
  return value.replace(/(\d{2})(\d{4,5})(\d{4})/, "($1) $2-$3");
};
