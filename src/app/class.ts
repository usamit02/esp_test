export interface User {
  id: string;
  na: string;
  displayName: string;
  photoURL: string;
  avatar: string;
  image: string;
  token: string;
  admin: number;
  direct: string;
  p?: number;
  plan?: string;
  trial?: string;
  bank?: string;
}
export const USER = { id: "", na: "ゲスト", displayName: "", photoURL: "", avatar: "https://bloggersguild.cf/img/avatar.jpg", image: "https://bloggersguild.cf/img/avatar.jpg", token: "", admin: 0, direct: 'block' };
export interface Column {
  parent: number;
  id: number;
  na: string;
  kana: string;
  image: string;
  description: string;
  user?: string;
  acked?: Date;
  idx?: number;
  lock?: number;
}
export const COLUMN = { parent: 0, id: 0, na: "新しいコラムを追加", kana: "", image: "", description: "" };