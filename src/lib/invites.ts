export type InvitePayload = {
  id: string;
  disciplineId: string;
  code: string;
  expiresAt?: string | null;
  active: boolean;
};

export const isInviteExpired = (invite: InvitePayload) =>
  Boolean(invite.expiresAt && new Date(invite.expiresAt).getTime() < Date.now());

export const inviteStatusLabel = (invite: InvitePayload) => {
  if (!invite.active) return "Inativo";
  if (isInviteExpired(invite)) return "Expirado";
  return "Ativo";
};

export const formatInviteExpiration = (expiresAt?: string | null) => {
  if (!expiresAt) return "Sem expiração";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(expiresAt));
};
