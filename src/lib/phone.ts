export const phoneExample = "+55 (11) 99999-9999";

const onlyDigits = (value: string) => value.replace(/\D/g, "");

export const normalizePhoneDigits = (value: string) => onlyDigits(value);

export const normalizePhone = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return "";

  const digits = onlyDigits(trimmed);
  if (!digits) return "";

  return digits;
};

export const formatInternationalPhoneInput = (value: string) => {
  const digits = onlyDigits(value).slice(0, 15);
  if (!digits) return "";

  if (digits.startsWith("55")) {
    const country = digits.slice(0, 2);
    const area = digits.slice(2, 4);
    const local = digits.slice(4);
    const first = local.length > 8 ? local.slice(0, 5) : local.slice(0, 4);
    const second = local.length > 8 ? local.slice(5, 9) : local.slice(4, 8);

    if (!local) {
      return [`+${country}`, area].filter(Boolean).join(" ");
    }

    const areaCode = area.length === 2 ? `(${area})` : area;

    return [
      `+${country}`,
      areaCode,
      first && second ? `${first}-${second}` : first,
    ]
      .filter(Boolean)
      .join(" ");
  }

  const country = digits.slice(0, Math.min(3, digits.length));
  const rest = digits.slice(country.length);
  const groups = rest.match(/.{1,4}/g) ?? [];

  return [`+${country}`, ...groups].filter(Boolean).join(" ");
};

export const isValidInternationalPhone = (value: string) => {
  const normalized = normalizePhone(value);
  const digits = onlyDigits(normalized);

  return digits.length >= 10 && digits.length <= 15;
};
