export const APP_CONFIG = {
  APP_NAME: "Cursive Quests",
  SUPPORT_EMAIL: "hello@cursive.team",
};

export type StoreSortMappingType = "ALL" | "UNLOCKED" | "REDEEMED";
export type QuestTagMappingType = "ALL" | "IN_PROGRESS" | "COMPLETED";

export const QuestTagMapping: Record<QuestTagMappingType, string> = {
  ALL: "All",
  COMPLETED: "Completed",
  IN_PROGRESS: "In Progress",
};

export const StoreSortMapping: Record<StoreSortMappingType, string> = {
  ALL: "All",
  UNLOCKED: "Unlocked",
  REDEEMED: "Redeemed",
};

export const WebauthnRegistrationOptions = {
  rpName: "cursive-quests",
  rpID: "cursive",
  userID: "user",
  userName: "username",
};

export const WebauthnAuthenticationOptions = {
  rpID: "cursive",
};
