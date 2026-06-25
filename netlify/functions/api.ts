import * as serverless from "serverless-http";
import app from "../../server";

const s = (serverless as any).default || serverless;
export const handler = s(app, { basePath: "/.netlify/functions/api" });
