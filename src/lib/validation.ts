import { isValidInternationalPhone, phoneExample } from "@/lib/phone";

export const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const requiredTrimmed =
  (message: string) =>
  (value?: string) =>
    Boolean(value?.trim()) || message;

export const emailRules = (
  requiredMessage = "Informe o email",
  invalidMessage = "Informe um email válido"
) => ({
  required: requiredMessage,
  pattern: {
    value: emailPattern,
    message: invalidMessage,
  },
});

export const optionalEmailRules = (
  invalidMessage = "Informe um email válido"
) => ({
  validate: (value?: string) =>
    !value?.trim() || emailPattern.test(value) || invalidMessage,
});

export const phoneRules = (
  requiredMessage = "Informe o telefone",
  invalidMessage = `Informe o telefone com DDI. Exemplo: ${phoneExample}`
) => ({
  required: requiredMessage,
  validate: (value: string) => isValidInternationalPhone(value) || invalidMessage,
});

export const optionalPhoneRules = (
  invalidMessage = `Informe o telefone com DDI. Exemplo: ${phoneExample}`
) => ({
  validate: (value?: string) =>
    !value?.trim() || isValidInternationalPhone(value) || invalidMessage,
});
