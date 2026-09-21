export type Role = "host" | "player";

export type User = {
  id: number;
  username: string;
  name: string;
  nickname: string;
  role: Role;
};
