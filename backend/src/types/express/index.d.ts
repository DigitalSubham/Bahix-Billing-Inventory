import "express";

declare module "express" {
  export interface Request {
    user?: any; // you can replace any with your User type later
  }
}
