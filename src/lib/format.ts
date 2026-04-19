import type { StudentStatus } from "@/lib/types";
import { formatInternationalPhoneInput } from "@/lib/phone";

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
  if (!value) return "Telefone não informado";
  return formatInternationalPhoneInput(value);
};
