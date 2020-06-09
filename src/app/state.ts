import { User, USER, Column, COLUMN } from './class'
export interface State {
  user: User,
  columns: Array<Column>
}


export const initialState = {
  user: USER,
  columns: [COLUMN]
}