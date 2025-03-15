import { IUser } from "../models/user.models.ts";

declare global {
  namespace Express {
    interface Request {
      user?: IUser;
    }
  }
}
