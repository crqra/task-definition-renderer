import { E } from './deps.ts';
import { EnvVarTuple, modify } from "./mod.ts";

const path = Deno.args[0];

const envVars = Deno.args.filter((a) => a.includes("=")).map(
  (a) => (a.split("=") as unknown as EnvVarTuple),
);

const result = await modify(path)(envVars)();

if (E.isLeft(result)) {
  console.error('Error modifying Task Definition: ', result.left);
  Deno.exit(1)
}
